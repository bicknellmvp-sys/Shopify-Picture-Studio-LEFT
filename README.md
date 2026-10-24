# Simple Shop Photo Fixer

The **Simple Shop Photo Fixer** is a powerful, web-based tool designed to help e-commerce store owners and administrators streamline their product image management for Shopify. 

It automates the tedious tasks of auditing, verifying, and preparing product images, ensuring your catalog meets Shopify's best practices for presentation and searchability.

## 🚀 Key Features

*   **⚡ State-Wide Bulk Scanning**: Efficiently audit up to 5,000 products and 10,000 images in a single session.
*   **✅ Compliance Auditing**: Automatically verify:
    *   1:1 Aspect Ratio consistency.
    *   Resolution standards.
    *   Metadata integrity.
*   **⚙️ Intelligent Tagging**: Generate local `.metadata.json` files and create S3 EXIF tags for automated backend workflows.
*   **📊 Shopify Ready**: Generate and download a consolidated Shopify CSV report for seamless catalog imports.
*   **🔒 Performance Conscious**: Includes Shopify API throttle protection to ensure stable operation during heavy load.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js/Express (handling proxy operations).
- **Tooling**: Built with modern web performance in mind.

## 🏁 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📦 Building for Production

To build the application for deployment:
```bash
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## 📄 License

This project is proprietary.
