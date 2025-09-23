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
export declare class DateParser {
    private static readonly RELATIVE_PATTERNS;
    private static readonly PERIOD_PATTERNS;
    static parseDate(text: string, referenceDate?: Date): ParsedDate | null;
    static parsePeriod(text: string, referenceDate?: Date): DateRange | null;
    static parseDates(text: string, referenceDate?: Date): ParsedDate[];
    static formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'relative'): string;
    static getPeriodRange(period: string, referenceDate?: Date): DateRange;
    private static parseWithPatterns;
    private static calculateChronoConfidence;
    private static isRelativeDate;
    private static determineGranularity;
    private static formatRelativeDate;
    static isValidDate(date: any): boolean;
    static getSmartDefaultDate(text: string): Date;
    private static hasDateContext;
}
//# sourceMappingURL=date-parser.d.ts.map