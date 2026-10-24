export interface ProductImage {
  id: string;
  url: string;
  width?: number;
  height?: number;
  isLowRes?: boolean;
}

export interface OptimizationHistory {
  id: string;
  originalUrl: string;
  optimizedUrl: string;
  transformationType: string;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  sku: string;
  category: string;
  price: number;
  images: ProductImage[];
  status: 'optimized' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  aiScore: number; // 0 to 100
  history: OptimizationHistory[];
}

export interface DashboardStats {
  totalProducts: number;
  criticalCount: number;
  warningCount: number;
  optimizedCount: number;
  singleImageCount: number;
  lowResCount: number;
  clutteredBgCount: number;
  averageScore: number;
}
