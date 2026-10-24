import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const app = express();
const PORT = 3000;

// Cloud credentials in-memory store with environment fallback
let memoryCloudConfig = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "",
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || "",
  CDN_URL_PREFIX: process.env.CDN_URL_PREFIX || "",
};

function getS3ClientAndBucket() {
  const accessKeyId = memoryCloudConfig.AWS_ACCESS_KEY_ID;
  const secretAccessKey = memoryCloudConfig.AWS_SECRET_ACCESS_KEY;
  const bucket = memoryCloudConfig.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const s3Config: any = {
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region: memoryCloudConfig.AWS_REGION || "us-east-1",
  };

  if (memoryCloudConfig.AWS_S3_ENDPOINT) {
    s3Config.endpoint = memoryCloudConfig.AWS_S3_ENDPOINT;
    s3Config.forcePathStyle = true;
  }

  return {
    client: new S3Client(s3Config),
    bucket,
    cdnUrlPrefix: memoryCloudConfig.CDN_URL_PREFIX,
  };
}

// Increase request size limits for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure upload directories exist
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads statically BEFORE Vite middleware so it's handled by Express
app.use("/uploads", express.static(UPLOADS_DIR));

// Initialize Gemini SDK with telemetry headers
const apiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found, running in fallback mode.");
}

// Get App base URL for full image link generation
function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

// Generate nice default images if none exist (using HTML Canvas represented as SVG or simple inline shapes)
const DEMO_PRODUCTS = [
  {
    id: "prod-1",
    title: "Eco-Leather Minimalist Wallet",
    sku: "WAL-MIN-01",
    category: "Accessories",
    price: 49.0,
    images: [
      {
        id: "img-1-1",
        url: "/uploads/demo-wallet-1.jpg",
        width: 400,
        height: 300,
        isLowRes: true,
      },
    ],
    status: "critical",
    issues: [
      "Only 1 product image present (recommend 3-5 images)",
      "Low resolution (400x300px, recommend at least 1000x1000px)",
      "Background is cluttered and distracts from the wallet",
    ],
    recommendations: [
      "Add at least 3 more high-resolution shots from different angles.",
      "Remove the current busy background to highlight the product details.",
      "Provide a lifestyle context image in everyday use.",
    ],
    aiScore: 42,
    history: [],
  },
  {
    id: "prod-2",
    title: "Ergonomic Task Office Chair",
    sku: "CHR-ERG-09",
    category: "Furniture",
    price: 249.0,
    images: [
      {
        id: "img-2-1",
        url: "/uploads/demo-chair-1.jpg",
        width: 1200,
        height: 1200,
        isLowRes: false,
      },
      {
        id: "img-2-2",
        url: "/uploads/demo-chair-2.jpg",
        width: 1200,
        height: 1200,
        isLowRes: false,
      },
    ],
    status: "warning",
    issues: ["Cluttered background in secondary lifestyle photo"],
    recommendations: [
      "Isolate the main chair image onto a pure white background.",
      "Use Everyday Scenes tool to place the chair in a clean modern home office setting.",
      "Add close-ups of the lumbar support adjustments.",
    ],
    aiScore: 78,
    history: [],
  },
  {
    id: "prod-3",
    title: "Double-Walled Ceramic Mug",
    sku: "MUG-CER-04",
    category: "Kitchenware",
    price: 18.5,
    images: [
      {
        id: "img-3-1",
        url: "/uploads/demo-mug-1.jpg",
        width: 800,
        height: 800,
        isLowRes: false,
      },
    ],
    status: "warning",
    issues: ["Only 1 product image present (recommend 3-5 images)"],
    recommendations: [
      "Duplicate pictures by rotating 90 degrees or changing colors to show variations.",
      "Generate a coffee-shop everyday scene background.",
      "Add an action shot showing hot coffee pouring into the mug.",
    ],
    aiScore: 65,
    history: [],
  },
  {
    id: "prod-4",
    title: "True-Wireless Noise Canceling Earbuds",
    sku: "EAR-TWS-12",
    category: "Electronics",
    price: 129.99,
    images: [
      {
        id: "img-4-1",
        url: "/uploads/demo-earbuds-1.jpg",
        width: 1080,
        height: 1080,
        isLowRes: false,
      },
      {
        id: "img-4-2",
        url: "/uploads/demo-earbuds-2.jpg",
        width: 1080,
        height: 1080,
        isLowRes: false,
      },
      {
        id: "img-4-3",
        url: "/uploads/demo-earbuds-3.jpg",
        width: 1080,
        height: 1080,
        isLowRes: false,
      },
    ],
    status: "optimized",
    issues: [],
    recommendations: ["Great overall quality. Consider adding localized text overlays for features."],
    aiScore: 95,
    history: [],
  },
];

// Write default dummy files if they don't exist
function createDummyImage(fileName: string, color: string, text: string) {
  const filePath = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(filePath)) return;

  // We can write simple stylish PNG base64 values or mock graphics
  // Let's write standard base64 strings of tiny colored squares
  let base64 = "";
  if (fileName === "demo-wallet-1.jpg") {
    // A minimalist leather wallet SVG represented in base64 or drawn directly
    base64 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAIAAAD6/aY6AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAd0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDBAnAAAH0bV7IAAAAASUVORK5CYII=";
  } else {
    base64 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQMAAAC6Cg9bAAAAA1UEFQAAAnYBz7S/AAAAA1BMVEV8mZndYst9AAAAnklEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDBVYAABm8WnoAAAAABJRU5ErkJggg==";
  }
  fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
}

try {
  createDummyImage("demo-wallet-1.jpg", "#5c4033", "Leather Wallet");
  createDummyImage("demo-chair-1.jpg", "#1e293b", "Office Chair Front");
  createDummyImage("demo-chair-2.jpg", "#334155", "Office Chair Angle");
  createDummyImage("demo-mug-1.jpg", "#f5f5f4", "Ceramic Mug");
  createDummyImage("demo-earbuds-1.jpg", "#0f172a", "Earbuds Case");
  createDummyImage("demo-earbuds-2.jpg", "#1e293b", "Earbud Right");
  createDummyImage("demo-earbuds-3.jpg", "#334155", "Earbud Left");
} catch (e) {
  console.log("Could not generate demo files: ", e);
}

// Global mutable store for this instance
let products = [...DEMO_PRODUCTS];

// API: List Shopify Products
app.get("/api/products", (req, res) => {
  const baseUrl = getBaseUrl(req);
  // Map relative URLs to absolute links so they can be accessed anywhere
  const updatedProducts = products.map((prod) => ({
    ...prod,
    images: prod.images.map((img) => ({
      ...img,
      url: img.url.startsWith("/") ? `${baseUrl}${img.url}` : img.url,
    })),
    history: prod.history.map((hist) => ({
      ...hist,
      originalUrl: hist.originalUrl.startsWith("/") ? `${baseUrl}${hist.originalUrl}` : hist.originalUrl,
      optimizedUrl: hist.optimizedUrl.startsWith("/") ? `${baseUrl}${hist.optimizedUrl}` : hist.optimizedUrl,
    })),
  }));
  res.json({ products: updatedProducts });
});

// API: Reset Store
app.post("/api/products/reset", (req, res) => {
  products = JSON.parse(JSON.stringify(DEMO_PRODUCTS));
  res.json({ success: true, products });
});

// API: Add New Product
app.post("/api/products", (req, res) => {
  const { title, sku, category, price, imageUrls } = req.body;
  const newProduct = {
    id: `prod-${Date.now()}`,
    title: title || "New Product",
    sku: sku || `SKU-${Math.floor(Math.random() * 10000)}`,
    category: category || "General",
    price: parseFloat(price) || 0.0,
    images: (imageUrls || []).map((url: string, index: number) => ({
      id: `img-${Date.now()}-${index}`,
      url: url,
      width: 1000,
      height: 1000,
      isLowRes: false,
    })),
    status: (imageUrls || []).length === 1 ? "warning" : "optimized",
    issues: (imageUrls || []).length === 1 ? ["Only 1 product image present (recommend 3-5 images)"] : [],
    recommendations: (imageUrls || []).length === 1 ? ["Add at least 3 more high-resolution shots."] : ["Review listings for background clutter."],
    aiScore: (imageUrls || []).length === 1 ? 70 : 90,
    history: [],
  };

  // Run a default analysis if Gemini is available, otherwise append
  products.unshift(newProduct as any);
  res.json({ success: true, product: newProduct });
});

// API: Get Cloud Config and Status
app.get("/api/cloud-config", (req, res) => {
  const isConfigured = !!(
    memoryCloudConfig.AWS_ACCESS_KEY_ID &&
    memoryCloudConfig.AWS_SECRET_ACCESS_KEY &&
    memoryCloudConfig.AWS_S3_BUCKET
  );

  res.json({
    success: true,
    isConfigured,
    config: {
      AWS_ACCESS_KEY_ID: memoryCloudConfig.AWS_ACCESS_KEY_ID ? `${memoryCloudConfig.AWS_ACCESS_KEY_ID.substring(0, 5)}...` : "",
      AWS_SECRET_ACCESS_KEY: memoryCloudConfig.AWS_SECRET_ACCESS_KEY ? "********" : "",
      AWS_REGION: memoryCloudConfig.AWS_REGION,
      AWS_S3_BUCKET: memoryCloudConfig.AWS_S3_BUCKET,
      AWS_S3_ENDPOINT: memoryCloudConfig.AWS_S3_ENDPOINT,
      CDN_URL_PREFIX: memoryCloudConfig.CDN_URL_PREFIX,
    }
  });
});

// API: Set Custom Cloud Config
app.post("/api/cloud-config", (req, res) => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET, AWS_S3_ENDPOINT, CDN_URL_PREFIX } = req.body;
  
  if (AWS_ACCESS_KEY_ID !== undefined) memoryCloudConfig.AWS_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID;
  if (AWS_SECRET_ACCESS_KEY !== undefined) memoryCloudConfig.AWS_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY;
  if (AWS_REGION !== undefined) memoryCloudConfig.AWS_REGION = AWS_REGION;
  if (AWS_S3_BUCKET !== undefined) memoryCloudConfig.AWS_S3_BUCKET = AWS_S3_BUCKET;
  if (AWS_S3_ENDPOINT !== undefined) memoryCloudConfig.AWS_S3_ENDPOINT = AWS_S3_ENDPOINT;
  if (CDN_URL_PREFIX !== undefined) memoryCloudConfig.CDN_URL_PREFIX = CDN_URL_PREFIX;

  res.json({ success: true, isConfigured: !!(memoryCloudConfig.AWS_ACCESS_KEY_ID && memoryCloudConfig.AWS_SECRET_ACCESS_KEY && memoryCloudConfig.AWS_S3_BUCKET) });
});

// API: Upload an Image
app.post("/api/upload", async (req, res) => {
  const { base64Image, fileName, productId, sku, title } = req.body;
  if (!base64Image) {
    return res.status(400).json({ error: "Missing base64Image content" });
  }

  try {
    // Extract base64 payload
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = "image/png";
    let dataBuffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      dataBuffer = Buffer.from(matches[2], "base64");
    } else {
      dataBuffer = Buffer.from(base64Image, "base64");
    }

    const extension = mimeType.split("/")[1] || "png";
    const name = fileName ? `${path.parse(fileName).name}-${Date.now()}.${extension}` : `opt-${Date.now()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, name);

    fs.writeFileSync(filePath, dataBuffer);

    // Write companion metadata sidecar JSON file so it's always recognized as belonging to a product
    const metaPath = filePath + ".metadata.json";
    const metadataContent = {
      originalFileName: fileName || name,
      savedAt: new Date().toISOString(),
      associatedProduct: {
        id: productId || "unknown",
        sku: sku || "unknown",
        title: title || "untitled",
      },
      shopifyBestUseCases: {
        recommendedAspectRatio: "1:1 Square (Shopify Best Practice)",
        recommendedResolution: "2048 x 2048 px (Enables rich mouse-over zoom)",
        maximumFileSize: "20 MB (Shopify Limit)",
        webpFormatAdvantage: "Yes (Boosts search ranking and loading speeds)",
        altTagAdvice: `${title || "Product"} - SKU ${sku || "N/A"} - Professional high-resolution layout overview (Shopify SEO Optimized)`
      }
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadataContent, null, 2));

    const baseUrl = getBaseUrl(req);
    const localUrl = `${baseUrl}/uploads/${name}`;
    let finalUrl = localUrl;
    let isCloud = false;

    // Try cloud storage upload with embedded metadata tags
    const cloud = getS3ClientAndBucket();
    if (cloud) {
      try {
        const key = `optimized-images/${Date.now()}-${name}`;
        
        // Sanitize strings for ASCII S3 metadata headers safely
        const cleanTitle = (title || "untitled").replace(/[^\x20-\x7E]/g, "?").substring(0, 80);
        const cleanSku = (sku || "unknown").replace(/[^\x20-\x7E]/g, "?").substring(0, 40);
        const cleanProductId = (productId || "unknown").replace(/[^\x20-\x7E]/g, "?").substring(0, 40);

        await cloud.client.send(
          new PutObjectCommand({
            Bucket: cloud.bucket,
            Key: key,
            Body: dataBuffer,
            ContentType: mimeType,
            ACL: "public-read",
            Metadata: {
              "productid": cleanProductId,
              "sku": cleanSku,
              "title": cleanTitle,
              "generator": "Simple-Shop-Photo-Fixer",
              "compliance": "Shopify-Square-Zoom-Compliant"
            }
          })
        );

        isCloud = true;
        if (cloud.cdnUrlPrefix) {
          const prefix = cloud.cdnUrlPrefix.replace(/\/$/, "");
          finalUrl = `${prefix}/${key}`;
        } else if (memoryCloudConfig.AWS_S3_ENDPOINT) {
          const endpoint = memoryCloudConfig.AWS_S3_ENDPOINT.replace(/\/$/, "");
          finalUrl = `${endpoint}/${cloud.bucket}/${key}`;
        } else {
          finalUrl = `https://${cloud.bucket}.s3.${memoryCloudConfig.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
        }
        console.log(`Successfully uploaded ${name} to Cloud Storage with metadata tags: ${finalUrl}`);
      } catch (s3Error: any) {
        console.error("Cloud upload failed, falling back to container local storage:", s3Error);
      }
    }

    res.json({
      success: true,
      url: finalUrl,
      localUrl,
      isCloud,
      fileName: name,
      size: dataBuffer.length,
      metadata: metadataContent
    });
  } catch (error: any) {
    console.error("Error saving uploaded image:", error);
    res.status(500).json({ error: "Failed to upload image to the cloud" });
  }
});

// API: Replace original URLs with CDN/S3/R2 Cloud URLs in Shopify CSV
app.post("/api/edit-csv", (req, res) => {
  const { csv_content, replacements } = req.body;
  if (!csv_content) {
    return res.status(400).json({ error: "Missing csv_content" });
  }

  try {
    let updatedCsv = csv_content;
    if (replacements && typeof replacements === "object") {
      for (const [orig, replacement] of Object.entries(replacements)) {
        if (orig && replacement) {
          // Escape special regex characters in the original URL
          const escapedOrig = (orig as string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedOrig, 'g');
          updatedCsv = updatedCsv.replace(regex, replacement as string);
        }
      }
    }

    res.json({
      success: true,
      csv_text: updatedCsv
    });
  } catch (error: any) {
    console.error("Error substituting image URLs in CSV:", error);
    res.status(500).json({ error: "Failed to compile updated CSV file" });
  }
});

// API: Scan image or product listing using Gemini AI
app.post("/api/scan", async (req, res) => {
  const { productId, imageUrl, base64Image, title } = req.body;

  if (!ai) {
    // Fallback Mock Scanner when API Key is missing or invalid
    const isSingle = true; // Simulating scan parameters
    const mockAnalysis = {
      aiScore: 68,
      status: "warning",
      issues: [
        "Low image variety: Listing only contains 1 image.",
        "Cluttered background: Background distracts from the main item.",
        "Missing alternate perspectives: No close-ups, dimensions, or lifestyle shots.",
      ],
      recommendations: [
        "Use our background removal tool to focus entirely on the product.",
        "Add at least 3 dynamic angles to increase e-commerce conversion rates.",
        "Duplicate this picture by rotating or recoloring to represent different product options.",
      ],
    };
    return res.json({ success: true, ...mockAnalysis, isFallback: true });
  }

  try {
    let imagePart: any = null;

    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      };
    } else if (imageUrl) {
      // Try to read locally if it is served from our uploads
      const urlParts = imageUrl.split("/uploads/");
      if (urlParts.length === 2) {
        const localPath = path.join(UPLOADS_DIR, urlParts[1]);
        if (fs.existsSync(localPath)) {
          const fileData = fs.readFileSync(localPath);
          imagePart = {
            inlineData: {
              mimeType: "image/jpeg",
              data: fileData.toString("base64"),
            },
          };
        }
      }

      // If not a local file, we fetch it or we fall back to text analysis
      if (!imagePart) {
        try {
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          imagePart = {
            inlineData: {
              mimeType: response.headers.get("content-type") || "image/jpeg",
              data: buffer.toString("base64"),
            },
          };
        } catch (fetchErr) {
          console.warn("Could not fetch remote image for Gemini, proceeding with text-only scan:", fetchErr);
        }
      }
    }

    const parts: any[] = [];
    if (imagePart) {
      parts.push(imagePart);
    }
    parts.push({
      text: `Analyze this product image and product metadata for e-commerce viability.
Product Name: "${title || "E-commerce Item"}"

Assess the image for the following attributes:
1. Is the background cluttered or professional?
2. Is the lighting adequate and resolution sufficient?
3. What is the e-commerce design viability score out of 100?
4. List specific e-commerce checklist issues (e.g., cluttered background, poor lighting, only 1 image).
5. Provide actionable, professional recommendations for optimization.

Respond strictly in structured JSON format matching this schema:
{
  "aiScore": number, // an integer score between 0 and 100
  "status": "optimized" | "warning" | "critical", // category based on score: 85+ optimized, 60-84 warning, below 60 critical
  "issues": string[], // list of 2-4 critical issues found
  "recommendations": string[] // list of 2-4 concrete, professional optimizations
}`,
    });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiScore: { type: Type.INTEGER },
            status: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["aiScore", "status", "issues", "recommendations"],
        },
      },
    });

    const resultText = geminiResponse.text?.trim() || "{}";
    const parsedResult = JSON.parse(resultText);

    // If a productId was passed, update our store!
    if (productId) {
      const idx = products.findIndex((p) => p.id === productId);
      if (idx !== -1) {
        products[idx].aiScore = parsedResult.aiScore || 70;
        products[idx].status = parsedResult.status || "warning";
        products[idx].issues = parsedResult.issues || [];
        products[idx].recommendations = parsedResult.recommendations || [];
      }
    }

    res.json({ success: true, ...parsedResult });
  } catch (err: any) {
    console.error("Error during Gemini scan:", err);
    res.status(500).json({ error: "Gemini analysis failed", details: err.message });
  }
});

// API: Save Optimization History
app.post("/api/products/history", (req, res) => {
  const { productId, originalUrl, optimizedUrl, transformationType } = req.body;
  const idx = products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    const historyItem = {
      id: `hist-${Date.now()}`,
      originalUrl,
      optimizedUrl,
      transformationType,
      createdAt: new Date().toISOString(),
    };
    products[idx].history.push(historyItem);
    
    // Also add to product's active image list if they wish, or we can just append it!
    // To make it functional, let's also append this optimized image to the product's image library!
    products[idx].images.push({
      id: `img-${Date.now()}`,
      url: optimizedUrl,
      width: 1024,
      height: 1024,
      isLowRes: false,
    });

    // Mark as optimized or increment score because they just optimized it!
    products[idx].aiScore = Math.min(100, products[idx].aiScore + 15);
    if (products[idx].aiScore >= 85) {
      products[idx].status = "optimized";
    }

    return res.json({ success: true, product: products[idx] });
  }
  res.status(404).json({ error: "Product not found" });
});

// Setup Vite Dev server middleware or static serve in Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
