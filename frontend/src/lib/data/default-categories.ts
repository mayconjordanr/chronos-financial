import { Category } from "@/lib/schemas/category"

// Predefined color palette for categories
export const categoryColors = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#22c55e", // green
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
]

// Financial icon categories with lucide-react icon names
export const financialIcons = {
  income: [
    { name: "Briefcase", category: "Work", keywords: ["job", "career", "office"] },
    { name: "DollarSign", category: "Money", keywords: ["salary", "payment", "cash"] },
    { name: "TrendingUp", category: "Investment", keywords: ["growth", "profit", "stocks"] },
    { name: "PiggyBank", category: "Savings", keywords: ["save", "bank", "deposit"] },
    { name: "Coins", category: "Income", keywords: ["coins", "money", "earnings"] },
    { name: "CreditCard", category: "Payment", keywords: ["card", "transaction"] },
    { name: "Banknote", category: "Cash", keywords: ["bill", "currency", "money"] },
    { name: "HandCoins", category: "Received", keywords: ["received", "given", "payment"] },
  ],
  expense: [
    // Food & Dining
    { name: "UtensilsCrossed", category: "Food", keywords: ["food", "dining", "restaurant", "eat"] },
    { name: "Coffee", category: "Food", keywords: ["coffee", "cafe", "beverage", "drink"] },
    { name: "Pizza", category: "Food", keywords: ["pizza", "fast food", "takeout"] },
    { name: "Wine", category: "Food", keywords: ["alcohol", "wine", "bar", "drinks"] },

    // Transportation
    { name: "Car", category: "Transport", keywords: ["car", "vehicle", "driving", "auto"] },
    { name: "Bus", category: "Transport", keywords: ["bus", "public transport", "commute"] },
    { name: "Plane", category: "Transport", keywords: ["flight", "travel", "airplane", "trip"] },
    { name: "Bike", category: "Transport", keywords: ["bicycle", "bike", "cycling"] },
    { name: "Train", category: "Transport", keywords: ["train", "railway", "subway"] },
    { name: "Fuel", category: "Transport", keywords: ["gas", "fuel", "petrol", "diesel"] },

    // Bills & Utilities
    { name: "Zap", category: "Bills", keywords: ["electricity", "power", "energy", "electric"] },
    { name: "Home", category: "Bills", keywords: ["rent", "mortgage", "housing", "home"] },
    { name: "Phone", category: "Bills", keywords: ["phone", "mobile", "cellular", "telecom"] },
    { name: "Wifi", category: "Bills", keywords: ["internet", "wifi", "broadband", "connection"] },
    { name: "Droplets", category: "Bills", keywords: ["water", "utilities", "plumbing"] },
    { name: "Flame", category: "Bills", keywords: ["gas", "heating", "energy"] },

    // Shopping
    { name: "ShoppingBag", category: "Shopping", keywords: ["shopping", "retail", "store", "purchase"] },
    { name: "ShoppingCart", category: "Shopping", keywords: ["groceries", "supermarket", "cart"] },
    { name: "Shirt", category: "Shopping", keywords: ["clothing", "clothes", "fashion", "apparel"] },
    { name: "Gift", category: "Shopping", keywords: ["gift", "present", "surprise"] },
    { name: "Package", category: "Shopping", keywords: ["package", "delivery", "shipping"] },

    // Entertainment
    { name: "Music", category: "Entertainment", keywords: ["music", "concerts", "streaming", "spotify"] },
    { name: "Gamepad2", category: "Entertainment", keywords: ["gaming", "games", "console", "entertainment"] },
    { name: "Film", category: "Entertainment", keywords: ["movies", "cinema", "film", "netflix"] },
    { name: "Ticket", category: "Entertainment", keywords: ["tickets", "events", "shows"] },
    { name: "Camera", category: "Entertainment", keywords: ["photography", "camera", "hobby"] },

    // Health & Fitness
    { name: "Heart", category: "Health", keywords: ["health", "medical", "wellness", "fitness"] },
    { name: "Pill", category: "Health", keywords: ["medicine", "pharmacy", "drugs", "prescription"] },
    { name: "Stethoscope", category: "Health", keywords: ["doctor", "medical", "checkup", "hospital"] },
    { name: "Dumbbell", category: "Health", keywords: ["gym", "fitness", "exercise", "workout"] },

    // Education & Learning
    { name: "GraduationCap", category: "Education", keywords: ["education", "school", "university", "learning"] },
    { name: "Book", category: "Education", keywords: ["books", "reading", "study", "knowledge"] },
    { name: "Laptop", category: "Education", keywords: ["laptop", "computer", "technology", "work"] },

    // Personal Care
    { name: "Scissors", category: "Personal", keywords: ["haircut", "salon", "grooming", "beauty"] },
    { name: "Bath", category: "Personal", keywords: ["personal care", "hygiene", "bathroom"] },

    // Miscellaneous
    { name: "Wrench", category: "Maintenance", keywords: ["repairs", "maintenance", "tools", "fix"] },
    { name: "PawPrint", category: "Pets", keywords: ["pets", "animals", "veterinary", "pet care"] },
    { name: "Baby", category: "Family", keywords: ["baby", "children", "family", "kids"] },
    { name: "Umbrella", category: "Insurance", keywords: ["insurance", "protection", "coverage"] },
  ]
}

// Default categories for new users
export const defaultCategories: Omit<Category, "id" | "createdAt" | "updatedAt">[] = [
  // Income Categories
  {
    name: "Salary",
    description: "Regular salary and wages",
    color: "#22c55e",
    icon: "Briefcase",
    type: "income",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Freelance",
    description: "Freelance work and consulting",
    color: "#10b981",
    icon: "DollarSign",
    type: "income",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Investments",
    description: "Dividends, capital gains, and investment returns",
    color: "#06b6d4",
    icon: "TrendingUp",
    type: "income",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Business",
    description: "Business income and profits",
    color: "#3b82f6",
    icon: "Coins",
    type: "income",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Other Income",
    description: "Miscellaneous income sources",
    color: "#8b5cf6",
    icon: "HandCoins",
    type: "income",
    isActive: true,
    sortOrder: 5,
  },

  // Expense Categories
  {
    name: "Food & Dining",
    description: "Restaurants, groceries, and food delivery",
    color: "#f59e0b",
    icon: "UtensilsCrossed",
    type: "expense",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Transportation",
    description: "Gas, public transport, and vehicle expenses",
    color: "#3b82f6",
    icon: "Car",
    type: "expense",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Bills & Utilities",
    description: "Rent, electricity, water, and other utilities",
    color: "#ef4444",
    icon: "Home",
    type: "expense",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Shopping",
    description: "Clothing, electronics, and general shopping",
    color: "#ec4899",
    icon: "ShoppingBag",
    type: "expense",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Entertainment",
    description: "Movies, games, and recreational activities",
    color: "#8b5cf6",
    icon: "Music",
    type: "expense",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Health & Fitness",
    description: "Medical expenses, gym, and health-related costs",
    color: "#22c55e",
    icon: "Heart",
    type: "expense",
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Education",
    description: "Books, courses, and educational expenses",
    color: "#6366f1",
    icon: "GraduationCap",
    type: "expense",
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "Personal Care",
    description: "Haircuts, spa, and personal grooming",
    color: "#d946ef",
    icon: "Scissors",
    type: "expense",
    isActive: true,
    sortOrder: 8,
  },
]

// Helper function to get all available icons
export const getAllIcons = () => [
  ...financialIcons.income,
  ...financialIcons.expense,
]

// Helper function to get icons by category
export const getIconsByCategory = (category: string) => {
  const allIcons = getAllIcons()
  return allIcons.filter(icon =>
    icon.category.toLowerCase() === category.toLowerCase()
  )
}

// Helper function to search icons
export const searchIcons = (query: string) => {
  const allIcons = getAllIcons()
  const searchTerm = query.toLowerCase()

  return allIcons.filter(icon =>
    icon.name.toLowerCase().includes(searchTerm) ||
    icon.category.toLowerCase().includes(searchTerm) ||
    icon.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))
  )
}