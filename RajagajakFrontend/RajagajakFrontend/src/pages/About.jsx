import { useEffect } from "react";
import {
  Cookie,
  Leaf,
  Nut,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import "./About.css";

const specialities = [
  {
    icon: Cookie,
    title: "Traditional Gajak",
    description: "A classic winter sweet rooted in traditional recipes.",
  },
  {
    icon: Nut,
    title: "Premium Dry Fruits",
    description: "Carefully selected dry fruits for rich, satisfying sweets.",
  },
  {
    icon: Sparkles,
    title: "Pin Khajoor",
    description: "A much-loved speciality made with pin khajoor.",
  },
  {
    icon: Leaf,
    title: "Anjeer & Natural Ingredients",
    description: "Anjeer and other natural ingredients in traditional sweets.",
  },
];

function GajakIllustration() {
  return (
    <svg
      className="about-illustration"
      viewBox="0 0 520 420"
      role="img"
      aria-label="Illustration of golden sesame gajak and dry fruits"
    >
      <defs>
        <linearGradient id="gajak-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8d783" />
          <stop offset="1" stopColor="#d99e3e" />
        </linearGradient>
        <linearGradient id="gajak-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bd7929" />
          <stop offset="1" stopColor="#93541f" />
        </linearGradient>
        <pattern
          id="sesame"
          width="38"
          height="34"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-25)"
        >
          <ellipse cx="8" cy="9" rx="3.2" ry="1.6" fill="#fff1be" />
          <ellipse cx="27" cy="24" rx="3" ry="1.5" fill="#f4e4b6" />
          <circle cx="30" cy="4" r="1.4" fill="#9b6428" />
        </pattern>
      </defs>
      <ellipse cx="272" cy="342" rx="185" ry="35" fill="#6b3b1c" opacity=".12" />
      <g transform="rotate(-11 260 230)">
        <rect
          x="96"
          y="191"
          width="322"
          height="122"
          rx="28"
          fill="url(#gajak-side)"
        />
        <rect
          x="96"
          y="164"
          width="322"
          height="125"
          rx="28"
          fill="url(#gajak-face)"
          stroke="#f9e5a8"
          strokeWidth="5"
        />
        <rect
          x="96"
          y="164"
          width="322"
          height="125"
          rx="28"
          fill="url(#sesame)"
        />
        <path
          d="M118 192c62-26 214-29 274-1"
          fill="none"
          stroke="#fff1be"
          strokeLinecap="round"
          strokeWidth="5"
          opacity=".6"
        />
      </g>
      <g transform="rotate(12 360 125)">
        <circle cx="360" cy="126" r="70" fill="#96501f" />
        <circle cx="360" cy="116" r="70" fill="url(#gajak-face)" />
        <circle cx="360" cy="116" r="70" fill="url(#sesame)" />
        <circle
          cx="360"
          cy="116"
          r="61"
          fill="none"
          stroke="#f9e5a8"
          strokeWidth="4"
        />
      </g>
      <g fill="#9a5726">
        <ellipse cx="147" cy="115" rx="17" ry="10" transform="rotate(-38 147 115)" />
        <ellipse cx="178" cy="91" rx="16" ry="9" transform="rotate(23 178 91)" />
        <ellipse cx="114" cy="142" rx="14" ry="8" transform="rotate(32 114 142)" />
      </g>
      <g fill="#f9e2a1">
        <circle cx="148" cy="115" r="2" />
        <circle cx="179" cy="92" r="2" />
        <circle cx="115" cy="141" r="2" />
      </g>
    </svg>
  );
}

export default function About() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content");
    const aboutDescription =
      "Discover RAJA GAJAK®, a Gajak Shop in Bhopal for traditional gajak, premium dry fruit sweets, and authentic Indian flavours.";

    document.title =
      "About RAJA GAJAK® | Traditional Gajak & Sweets in Bhopal";
    if (description) {
      description.setAttribute("content", aboutDescription);
    }

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
    };
  }, []);

  return (
    <div className="app-shell about-page">
      <Navbar />
      <main className="about-main">
        <section className="about-hero">
          <div className="about-hero-copy">
            <span className="eyebrow">A taste of tradition</span>
            <p className="about-wordmark">
              RAJA GAJAK<sup>®</sup>
            </p>
            <h1>About RAJA GAJAK® – Premium Gajak &amp; Traditional Indian Sweets</h1>
            <p className="about-tagline">
              RAJA GAJAK® – A trademark-registered name in gajak &amp; sweets,
              proudly serving pure taste and tradition since 2006.
            </p>
            <Link className="primary-button about-hero-link" to="/#products-section">
              Explore our sweets
            </Link>
          </div>
          <div className="about-hero-art">
            <span className="about-art-label">Made with tradition</span>
            <GajakIllustration />
            <span className="about-art-caption">Gajak &amp; natural goodness</span>
          </div>
        </section>

        <section className="about-story" aria-labelledby="about-story-heading">
          <div className="about-story-heading">
            <span className="eyebrow">Our story</span>
            <h2 id="about-story-heading">Traditional taste, since 2006</h2>
          </div>
          <div className="about-story-copy">
            <p>
              Welcome to our authentic Gajak Shop in Bhopal, Madhya Pradesh, a
              trusted destination for traditional Indian winter sweets crafted
              with purity, rich taste, and years of expertise. Proudly serving
              customers across Bhopal and nearby areas, we specialize in freshly
              prepared, handmade gajak varieties made using time-honored recipes
              and premium-quality ingredients.
            </p>
            <p>
              Many customers find us while searching for gajak near me or the
              best sweets in Bhopal, and they keep coming back for our pure
              ingredients and traditional recipes.
            </p>
          </div>
        </section>

        <section className="about-specialities" aria-labelledby="specialities-heading">
          <div className="about-section-heading">
            <span className="eyebrow">The ingredients we love</span>
            <h2 id="specialities-heading">Our Specialities</h2>
            <p>
              We focus on traditional gajak and sweets made with carefully
              selected ingredients.
            </p>
          </div>
          <div className="speciality-grid">
            {specialities.map(({ icon: Icon, title, description }, index) => (
              <article className="speciality-card" key={title}>
                <span className="speciality-number">0{index + 1}</span>
                <span className="speciality-icon">
                  <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <p className="about-ingredients">
            Including premium dry fruits, pin khajoor, anjeer, and other natural
            ingredients.
          </p>
        </section>

        <section className="about-promise" aria-labelledby="promise-heading">
          <div>
            <span className="eyebrow">Our commitment</span>
            <h2 id="promise-heading">Our Promise</h2>
          </div>
          <p>
            Our aim is to bring the authentic taste of traditional Indian sweets
            to our customers while maintaining a focus on ingredient quality,
            freshness, and traditional preparation methods.
          </p>
        </section>

        <section className="about-hindi" lang="hi" aria-labelledby="hindi-heading">
          <div className="about-hindi-heading">
            <span className="eyebrow">हमारी परंपरा</span>
            <h2 id="hindi-heading">
              राजा गजक® के बारे में – पारंपरिक गजक और मिठाइयों का विश्वसनीय नाम
            </h2>
            <p className="about-hindi-tagline">
              राजा गजक® – गजक और मिठाइयों में एक ट्रेडमार्क-पंजीकृत नाम, जो वर्ष
              2006 से शुद्ध स्वाद और परंपरा की सेवा कर रहा है।
            </p>
          </div>
          <div className="about-hindi-content">
            <p>
              भोपाल, मध्य प्रदेश में आपका स्वागत है। हम पारंपरिक भारतीय गजक और
              मिठाइयों के लिए समर्पित हैं। हमारी विशेषता पारंपरिक रेसिपी, चुनिंदा
              सामग्री और बेहतरीन स्वाद है। हम भोपाल और आसपास के क्षेत्रों के
              ग्राहकों तक पारंपरिक मिठाइयों का स्वाद पहुँचाने का प्रयास करते हैं।
            </p>
            <div className="about-hindi-points">
              <div>
                <h3>हमारी खासियत:</h3>
                <p>
                  प्रीमियम ड्राय फ्रूट्स, पिन खजूर, अंजीर और अन्य प्राकृतिक सामग्री
                  से बनी पारंपरिक मिठाइयाँ हमारी खासियत हैं।
                </p>
              </div>
              <div>
                <h3>हमारा उद्देश्य:</h3>
                <p>
                  हमारा उद्देश्य सामग्री की गुणवत्ता, ताज़गी और पारंपरिक स्वाद पर
                  ध्यान देते हुए ग्राहकों तक भारतीय मिठाइयों की असली मिठास
                  पहुँचाना है।
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
