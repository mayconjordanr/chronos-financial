import * as chrono from 'chrono-node';

export interface ParsedDate {
  date: Date;
  confidence: number;
  originalText: string;
  isRelative: boolean;
  granularity: 'day' | 'month' | 'year' | 'time';
}

export interface DateRange {
  start: Date;
  end: Date;
  period: string;
}

export class DateParser {
  private static readonly RELATIVE_PATTERNS = [
    // Today/Yesterday/Tomorrow
    { pattern: /\b(today|now)\b/i, days: 0, confidence: 0.95 },
    { pattern: /\b(yesterday|last night)\b/i, days: -1, confidence: 0.95 },
    { pattern: /\b(tomorrow)\b/i, days: 1, confidence: 0.95 },

    // Days of week
    { pattern: /\b(last|previous)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, days: -7, confidence: 0.9 },
    { pattern: /\b(next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, days: 7, confidence: 0.9 },
    { pattern: /\b(this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, days: 0, confidence: 0.85 },

    // Relative days
    { pattern: /\b(\d+)\s+days?\s+ago\b/i, days: 'extract_negative', confidence: 0.9 },
    { pattern: /\b(\d+)\s+days?\s+(from\s+now|later)\b/i, days: 'extract_positive', confidence: 0.9 },

    // Weeks
    { pattern: /\b(last|previous)\s+week\b/i, days: -7, confidence: 0.85 },
    { pattern: /\b(this)\s+week\b/i, days: 0, confidence: 0.8 },
    { pattern: /\b(next)\s+week\b/i, days: 7, confidence: 0.85 },
    { pattern: /\b(\d+)\s+weeks?\s+ago\b/i, days: 'extract_negative_weeks', confidence: 0.85 },

    // Months
    { pattern: /\b(last|previous)\s+month\b/i, days: -30, confidence: 0.8 },
    { pattern: /\b(this)\s+month\b/i, days: 0, confidence: 0.75 },
    { pattern: /\b(next)\s+month\b/i, days: 30, confidence: 0.8 },
  ];

  private static readonly PERIOD_PATTERNS = [
    { pattern: /\b(today|this\s+day)\b/i, period: 'today', confidence: 0.95 },
    { pattern: /\b(yesterday)\b/i, period: 'yesterday', confidence: 0.95 },
    { pattern: /\b(this\s+week)\b/i, period: 'this_week', confidence: 0.9 },
    { pattern: /\b(last\s+week|previous\s+week)\b/i, period: 'last_week', confidence: 0.9 },
    { pattern: /\b(this\s+month)\b/i, period: 'this_month', confidence: 0.9 },
    { pattern: /\b(last\s+month|previous\s+month)\b/i, period: 'last_month', confidence: 0.9 },
    { pattern: /\b(this\s+year)\b/i, period: 'this_year', confidence: 0.85 },
    { pattern: /\b(last\s+year|previous\s+year)\b/i, period: 'last_year', confidence: 0.85 },
  ];

  /**
   * Parse date from natural language text
   */
  static parseDate(text: string, referenceDate?: Date): ParsedDate | null {
    const reference = referenceDate || new Date();
    const cleanText = text.trim().toLowerCase();

    // Try chrono-node first (most accurate for complex dates)
    try {
      const chronoResults = chrono.parse(text, reference);

      if (chronoResults.length > 0) {
        const result = chronoResults[0];
        const confidence = this.calculateChronoConfidence(result);

        return {
          date: result.start.date(),
          confidence,
          originalText: result.text,
          isRelative: this.isRelativeDate(result.text),
          granularity: this.determineGranularity(result),
        };
      }
    } catch (error) {
      console.warn('Chrono parsing failed:', error);
    }

    // Fallback to pattern-based parsing
    return this.parseWithPatterns(cleanText, reference);
  }

  /**
   * Parse date period/range from text
   */
  static parsePeriod(text: string, referenceDate?: Date): DateRange | null {
    const reference = referenceDate || new Date();
    const cleanText = text.trim().toLowerCase();

    for (const { pattern, period } of this.PERIOD_PATTERNS) {
      if (pattern.test(cleanText)) {
        return this.getPeriodRange(period, reference);
      }
    }

    // Try to parse as a specific date and create a day range
    const parsedDate = this.parseDate(text, reference);
    if (parsedDate) {
      const start = new Date(parsedDate.date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(parsedDate.date);
      end.setHours(23, 59, 59, 999);

      return {
        start,
        end,
        period: 'specific_date',
      };
    }

    return null;
  }

  /**
   * Parse multiple dates from text
   */
  static parseDates(text: string, referenceDate?: Date): ParsedDate[] {
    const reference = referenceDate || new Date();
    const dates: ParsedDate[] = [];

    // Use chrono to find all date references
    try {
      const chronoResults = chrono.parse(text, reference);

      for (const result of chronoResults) {
        const confidence = this.calculateChronoConfidence(result);

        dates.push({
          date: result.start.date(),
          confidence,
          originalText: result.text,
          isRelative: this.isRelativeDate(result.text),
          granularity: this.determineGranularity(result),
        });
      }
    } catch (error) {
      console.warn('Chrono multiple dates parsing failed:', error);
    }

    return dates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format: 'short' | 'medium' | 'long' | 'relative' = 'medium'): string {
    const now = new Date();

    if (format === 'relative') {
      return this.formatRelativeDate(date, now);
    }

    const options: Intl.DateTimeFormatOptions = {
      short: { month: 'short', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    }[format];

    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get period range for common periods
   */
  static getPeriodRange(period: string, referenceDate?: Date): DateRange {
    const reference = referenceDate || new Date();

    switch (period) {
      case 'today':
        return {
          start: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()),
          end: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999),
          period: 'today',
        };

      case 'yesterday':
        const yesterday = new Date(reference);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
          end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999),
          period: 'yesterday',
        };

      case 'this_week':
        const startOfWeek = new Date(reference);
        startOfWeek.setDate(reference.getDate() - reference.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return { start: startOfWeek, end: endOfWeek, period: 'this_week' };

      case 'last_week':
        const lastWeekStart = new Date(reference);
        lastWeekStart.setDate(reference.getDate() - reference.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);

        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);

        return { start: lastWeekStart, end: lastWeekEnd, period: 'last_week' };

      case 'this_month':
        return {
          start: new Date(reference.getFullYear(), reference.getMonth(), 1),
          end: new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999),
          period: 'this_month',
        };

      case 'last_month':
        return {
          start: new Date(reference.getFullYear(), reference.getMonth() - 1, 1),
          end: new Date(reference.getFullYear(), reference.getMonth(), 0, 23, 59, 59, 999),
          period: 'last_month',
        };

      case 'this_year':
        return {
          start: new Date(reference.getFullYear(), 0, 1),
          end: new Date(reference.getFullYear(), 11, 31, 23, 59, 59, 999),
          period: 'this_year',
        };

      case 'last_year':
        return {
          start: new Date(reference.getFullYear() - 1, 0, 1),
          end: new Date(reference.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
          period: 'last_year',
        };

      default:
        throw new Error(`Unknown period: ${period}`);
    }
  }

  /**
   * Pattern-based date parsing (fallback)
   */
  private static parseWithPatterns(text: string, reference: Date): ParsedDate | null {
    for (const { pattern, days, confidence } of this.RELATIVE_PATTERNS) {
      const match = text.match(pattern);

      if (match) {
        let targetDate = new Date(reference);

        if (typeof days === 'number') {
          targetDate.setDate(targetDate.getDate() + days);
        } else if (days === 'extract_negative') {
          const numDays = parseInt(match[1], 10);
          if (!isNaN(numDays)) {
            targetDate.setDate(targetDate.getDate() - numDays);
          }
        } else if (days === 'extract_positive') {
          const numDays = parseInt(match[1], 10);
          if (!isNaN(numDays)) {
            targetDate.setDate(targetDate.getDate() + numDays);
          }
        } else if (days === 'extract_negative_weeks') {
          const numWeeks = parseInt(match[1], 10);
          if (!isNaN(numWeeks)) {
            targetDate.setDate(targetDate.getDate() - (numWeeks * 7));
          }
        }

        return {
          date: targetDate,
          confidence,
          originalText: match[0],
          isRelative: true,
          granularity: 'day',
        };
      }
    }

    return null;
  }

  /**
   * Calculate confidence for chrono results
   */
  private static calculateChronoConfidence(result: any): number {
    let confidence = 0.8; // Base confidence

    // Boost confidence for specific patterns
    if (result.start.isCertain('year')) confidence += 0.1;
    if (result.start.isCertain('month')) confidence += 0.05;
    if (result.start.isCertain('day')) confidence += 0.05;

    // Reduce confidence for uncertain dates
    if (!result.start.isCertain('year') && !result.start.isCertain('month')) {
      confidence -= 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if date is relative
   */
  private static isRelativeDate(text: string): boolean {
    const relativeWords = [
      'today', 'yesterday', 'tomorrow', 'now',
      'last', 'next', 'this', 'ago', 'later',
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ];

    return relativeWords.some(word => text.toLowerCase().includes(word));
  }

  /**
   * Determine date granularity
   */
  private static determineGranularity(result: any): 'day' | 'month' | 'year' | 'time' {
    if (result.start.isCertain('hour') || result.start.isCertain('minute')) {
      return 'time';
    }

    if (result.start.isCertain('day')) {
      return 'day';
    }

    if (result.start.isCertain('month')) {
      return 'month';
    }

    return 'year';
  }

  /**
   * Format relative date
   */
  private static formatRelativeDate(date: Date, reference: Date): string {
    const diffMs = date.getTime() - reference.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'tomorrow';
    } else if (diffDays === -1) {
      return 'yesterday';
    } else if (diffDays > 1 && diffDays <= 7) {
      return `in ${diffDays} days`;
    } else if (diffDays < -1 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays > 7) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'next week' : `in ${weeks} weeks`;
    } else {
      const weeks = Math.floor(Math.abs(diffDays) / 7);
      return weeks === 1 ? 'last week' : `${weeks} weeks ago`;
    }
  }

  /**
   * Validate date
   */
  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Get smart default date for transactions
   */
  static getSmartDefaultDate(text: string): Date {
    const now = new Date();

    // If no date context, default to today
    if (!this.hasDateContext(text)) {
      return now;
    }

    // Try to parse the date from text
    const parsed = this.parseDate(text);
    if (parsed) {
      return parsed.date;
    }

    return now;
  }

  /**
   * Check if text has date context
   */
  private static hasDateContext(text: string): boolean {
    const dateWords = [
      'today', 'yesterday', 'tomorrow', 'last', 'next', 'this',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'week', 'month', 'year', 'ago', 'on', 'at'
    ];

    return dateWords.some(word => text.toLowerCase().includes(word));
  }
}