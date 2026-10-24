export interface BackgroundScene {
  id: string;
  name: string;
  category: 'studio' | 'lifestyle' | 'seasonal';
  url: string;
  description: string;
}

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: "white",
    name: "Pure E-commerce White",
    category: "studio",
    url: "solid:#ffffff",
    description: "Standard clean Amazon/Shopify studio white background."
  },
  {
    id: "marble",
    name: "Luxury Marble Counter",
    category: "studio",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    description: "Elegant polished white marble with soft lighting, ideal for jewelry & cups."
  },
  {
    id: "wood",
    name: "Rustic Warm Oak Table",
    category: "lifestyle",
    url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    description: "Warm-toned textured wood grain. Perfect for organic products & wallets."
  },
  {
    id: "office",
    name: "Minimalist Modern Desk",
    category: "lifestyle",
    url: "https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?auto=format&fit=crop&w=800&q=80",
    description: "Soft focus modern desk setup, excellent for electronics & productivity."
  },
  {
    id: "concrete",
    name: "Industrial Grey Concrete",
    category: "studio",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    description: "Sleek matte gray cement background. Looks awesome for high-tech items."
  },
  {
    id: "living-room",
    name: "Cozy Shelving Interior",
    category: "lifestyle",
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
    description: "Modern styled home shelves. Beautiful lifestyle vibe for decor & books."
  },
  {
    id: "beach",
    name: "Coastal Sandy Sunset",
    category: "seasonal",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    description: "Sandy surface with soft golden sunset beach background. Perfect for sunglasses."
  },
  {
    id: "garden",
    name: "Fresh Botanical Greenery",
    category: "seasonal",
    url: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=800&q=80",
    description: "Lush out-of-focus tropical leaves. Great for cosmetics & health bottles."
  }
];
