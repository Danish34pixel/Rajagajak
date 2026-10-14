import { MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./WhatsAppChatButton.css";

const greeting =
  "Hi Rajagajak! 👋 I visited your website and would like to know more about your products. Please assist me. Thank you!";
const whatsappUrl = `https://wa.me/919244005152?text=${encodeURIComponent(greeting)}`;

export default function WhatsAppChatButton() {
  const { pathname } = useLocation();
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    let frameId;
    let observer;

    frameId = window.requestAnimationFrame(() => {
      const footer = document.querySelector(".site-footer");
      if (!footer) {
        setFooterVisible(false);
        return;
      }

      observer = new IntersectionObserver(([entry]) => {
        setFooterVisible(entry.isIntersecting);
      });
      observer.observe(footer);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [pathname]);

  return (
    <a
      className={`whatsapp-chat-button${footerVisible ? " is-footer-visible" : ""}`}
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle size={27} strokeWidth={2.2} aria-hidden="true" />
      <Phone
        className="whatsapp-chat-button-phone"
        size={13}
        strokeWidth={2.8}
        aria-hidden="true"
      />
    </a>
  );
}
