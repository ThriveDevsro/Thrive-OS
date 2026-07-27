import Image from "next/image";
import { CheckCircle2, Download, FileImage, Palette } from "lucide-react";
import { BrandColor } from "./brand-color";

const colors = [
  {
    name: "Thrive Black",
    value: "#090606",
    usage: "Primary backgrounds, headlines and dark logo surfaces",
  },
  {
    name: "Pure White",
    value: "#FFFFFF",
    usage: "Logo on dark backgrounds and clean layouts",
  },
  {
    name: "Digital Blue",
    value: "#2563EB",
    usage: "Links, actions and digital interface highlights",
  },
] as const;

const logoAssets = [
  {
    name: "Thrive Dev — full logo",
    description: "Use in presentations, proposals and wide layouts.",
    src: "/thrive-dev-logo.png",
    download: "thrive-dev-logo.png",
    width: 717,
    height: 197,
    className: "brand-logo-wide",
  },
  {
    name: "Thrive Dev — symbol",
    description: "Use for avatars, icons and compact layouts.",
    src: "/logo.png",
    download: "thrive-dev-symbol.png",
    width: 1563,
    height: 2048,
    className: "brand-logo-symbol",
  },
] as const;

export default function BrandPage() {
  return (
    <>
      <div className="list-heading brand-heading">
        <div>
          <h1>Brand</h1>
          <p>Official Thrive Dev assets for sales and client communication.</p>
        </div>
        <span><Palette size={15} /> Brand kit</span>
      </div>

      <section className="brand-section">
        <header>
          <div>
            <h2>Logos</h2>
            <p>Download the approved files. Do not recolour or distort them.</p>
          </div>
          <FileImage size={19} />
        </header>
        <div className="brand-logo-grid">
          {logoAssets.map((asset) => (
            <article key={asset.src}>
              <div className="brand-logo-preview">
                <Image
                  src={asset.src}
                  alt={asset.name}
                  width={asset.width}
                  height={asset.height}
                  className={asset.className}
                />
              </div>
              <div className="brand-asset-copy">
                <strong>{asset.name}</strong>
                <p>{asset.description}</p>
                <a href={asset.src} download={asset.download}>
                  <Download size={14} /> Download PNG
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="brand-section">
        <header>
          <div>
            <h2>Brand colours</h2>
            <p>Click a value to copy the exact HEX colour.</p>
          </div>
          <Palette size={19} />
        </header>
        <div className="brand-colour-grid">
          {colors.map((color) => (
            <BrandColor key={color.value} {...color} />
          ))}
        </div>
      </section>

      <section className="brand-section brand-guidelines">
        <header>
          <div>
            <h2>Quick rules</h2>
            <p>Keep the Thrive Dev identity consistent in every client touchpoint.</p>
          </div>
          <CheckCircle2 size={19} />
        </header>
        <div>
          <article>
            <strong>Give it space</strong>
            <p>Keep clear space around the logo. Do not place text or icons directly beside the mark.</p>
          </article>
          <article>
            <strong>Keep proportions</strong>
            <p>Resize from the corners and never stretch, squash or rotate the logo.</p>
          </article>
          <article>
            <strong>Use strong contrast</strong>
            <p>The supplied white logo belongs on black or another sufficiently dark background.</p>
          </article>
        </div>
      </section>
    </>
  );
}
