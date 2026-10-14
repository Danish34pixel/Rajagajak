import { useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import "./TermsAndConditions.css";

const terms = [
  {
    title: "Brand & Trademark",
    content: (
      <p>
        RAJA GAJAK® is a registered trademark. All brand names, logos, product
        names, images, text, and content displayed on this website are the
        exclusive property of Raja Gajak®. Unauthorized use, copying, or
        reproduction of any material is strictly prohibited.
      </p>
    ),
  },
  {
    title: "Product Information",
    content: (
      <p>
        Our sweets and gajak products are prepared using ingredients such as
        shudh desi ghee, gur, til, dry fruits, pin khajoor, anjeer, and other
        natural components, as applicable to individual products. While we
        strive to maintain accuracy, product appearance, weight, and taste may
        vary slightly due to handmade preparation and seasonal ingredients.
      </p>
    ),
  },
  {
    title: "Pricing & Availability",
    content: (
      <p>
        Product prices are subject to change without prior notice. Availability
        of items may vary based on season, demand, and raw material supply. Raja
        Gajak® reserves the right to limit quantities or discontinue any product
        at any time.
      </p>
    ),
  },
  {
    title: "Orders & Payments",
    content: (
      <p>
        Orders are subject to confirmation and successful payment through the
        payment methods offered on the website. Once an order is placed, it
        cannot be modified or canceled unless explicitly approved by Raja
        Gajak®. Applicable payment processing and order confirmation rules
        displayed during checkout will also apply.
      </p>
    ),
  },
  {
    title: "No Medical or Dietary Claims",
    content: (
      <p>
        Our sweets are prepared traditionally and may include sugar-free or
        jaggery-based options where available. However, Raja Gajak® does not make
        medical or health claims. Customers with dietary restrictions, food
        allergies, or medical conditions should review the applicable product
        ingredients and consult an appropriate healthcare professional when
        necessary.
      </p>
    ),
  },
  {
    title: "Returns & Refunds",
    content: (
      <p>
        Due to the perishable nature of sweets, returns or refunds are generally
        not accepted, subject to applicable consumer protection laws. In case of
        genuine issues related to product quality, incorrect items, or damage at
        the time of delivery, customers should contact us promptly with their
        order details and supporting evidence for review and resolution under
        the applicable policy.
      </p>
    ),
  },
  {
    title: "Hygiene & Quality Assurance",
    content: (
      <p>
        We aim to maintain appropriate hygiene and quality standards during
        preparation, packaging, and storage. After products are delivered or
        collected, customers are responsible for following the applicable
        storage instructions and consuming products within their recommended
        period.
      </p>
    ),
  },
  {
    title: "Website Usage",
    content: (
      <p>
        Users agree not to misuse the website, attempt unauthorized access,
        interfere with its operation, or engage in activities that may harm the
        website&apos;s functionality, reputation, or security.
      </p>
    ),
  },
  {
    title: "External Searches & Listings",
    content: (
      <p>
        Customers may discover Raja Gajak® through search queries such as “gajak
        near me” or “best sweets in Bhopal.” We are not responsible for the
        accuracy or availability of third-party listings, reviews, or platforms
        beyond our control. Customers should rely on our official website and
        contact channels for current product and order information.
      </p>
    ),
  },
  {
    title: "Governing Law",
    content: (
      <p>
        These Terms &amp; Conditions are governed by the applicable laws of
        India. Subject to applicable law, disputes shall be subject to the
        jurisdiction of competent courts in Bhopal, Madhya Pradesh.
      </p>
    ),
  },
  {
    title: "Updates to Terms",
    content: (
      <p>
        Raja Gajak® may update these Terms &amp; Conditions from time to time.
        Revised terms will be published on this page with an updated revision
        date where appropriate. Changes will take effect as required by
        applicable law.
      </p>
    ),
  },
];

export default function TermsAndConditions() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content");

    document.title = "Terms & Conditions | RAJA GAJAK®";
    if (description) {
      description.setAttribute(
        "content",
        "Read the Terms & Conditions for RAJA GAJAK® website browsing, product information, orders, payments, and returns.",
      );
    }

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
    };
  }, []);

  return (
    <div className="app-shell terms-page">
      <Navbar />
      <main className="terms-main">
        <header className="terms-heading">
          <span className="eyebrow">RAJA GAJAK®</span>
          <h1>Terms &amp; Conditions</h1>
          <p>
            Please read these terms carefully before browsing our website or
            placing an order.
          </p>
        </header>
        <article className="terms-document" aria-label="Terms and Conditions">
          <section className="terms-introduction">
            <h2>Introduction</h2>
            <p>
              Welcome to RAJA GAJAK®, a trademark-registered brand specializing
              in gajak and traditional Indian sweets. By accessing, browsing, or
              purchasing from our website or store, you agree to comply with the
              following Terms &amp; Conditions. Please read them carefully.
            </p>
          </section>
          <div className="terms-sections">
            {terms.map(({ title, content }, index) => (
              <section
                className="terms-section"
                id={`terms-${index + 1}`}
                key={title}
                aria-labelledby={`terms-heading-${index + 1}`}
              >
                <h2 id={`terms-heading-${index + 1}`}>
                  <span className="terms-section-number">{index + 1}.</span>
                  {title}
                </h2>
                {content}
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
