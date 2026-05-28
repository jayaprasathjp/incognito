import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import appIcon from "../assets/app-icon.png";
import { api, SOCKET_URL } from "../utils/api";
import SEO from "../components/SEO";

const Welcome = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [isSpectatorEnabled, setIsSpectatorEnabled] = useState(false);

  const faqs = [
    {
      q: "Is this legitimate?",
      a: (
        <span>
          Yes. INCØGNITØ ran its first season successfully. You can verify us on X and Instagram{" "}
          <a
            href="https://instagram.com/playincognitohq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            @playincognitohq
          </a>
          .
        </span>
      ),
    },
    {
      q: "Who can participate?",
      a: "University and campus students across Nigeria only. You will be required to select your university when registering.",
    },
    {
      q: "How do I register?",
      a: (
        <span>
          Visit{" "}
          <a
            href="https://www.playincognito.ng"
            className="text-blue-600 font-semibold hover:underline"
          >
            www.playincognito.ng
          </a>{" "}
          and complete registration and payment entirely on the website.
        </span>
      ),
    },
    {
      q: "How much is the entry fee?",
      a: "₦446 only.",
    },
    {
      q: "What is the prize?",
      a: "₦90,000 to the winner. Single elimination format, one loss and you're out.",
    },
    {
      q: "What if not enough people register?",
      a: "The tournament holds regardless of how many players register. The winner gets paid no matter what.",
    },
    {
      q: "When does registration open and close?",
      a: "Opens May 29th. Closes June 19th.",
    },
    {
      q: "What happens after I register?",
      a: "You'll have access to a personal dashboard showing your full match roadmap and round schedule.",
    },
    {
      q: "What platform is the tournament on?",
      a: "eFootball, fully automated and anonymous on our website.",
    },
    {
      q: "What does anonymous mean?",
      a: "Every player competes under an alias. Nobody knows who they're playing against.",
    },
    {
      q: "Who do I contact if I have an issue?",
      a: (
        <span>
          Reach out to our dedicated support WhatsApp number —{" "}
          <a
            href="https://wa.me/2348080433495"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            +234 808 043 3495
          </a>
        </span>
      ),
    },
  ];

  useEffect(() => {
    const checkTournament = async () => {
      try {
        // Use direct fetch to avoid "Bearer null" issues if not logged in
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
          `${SOCKET_URL}/api/tournaments/current`,
          {
            headers,
          },
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("Welcome: API Response not OK", response.status, text);
          return;
        }

        const data = await response.json();

        if (data && data.tournament) {
          const status = data.tournament.status?.toLowerCase();
          const regEnd = data.tournament.registration_end;

          // Button should be enabled if tournament is open or started
          const startedByStatus = [
            "open",
            "active",
            "scheduled",
            "paused",
            "completed",
          ].includes(status);
          const startedByDate = regEnd && new Date() > new Date(regEnd);

          if (startedByStatus || startedByDate) {
            setIsSpectatorEnabled(true);
          }
        }
      } catch (e) {
        console.error("Welcome: Failed to check tournament status", e);
      }
    };
    checkTournament();
  }, []);

  const Modal = ({ title, children, onClose }) => (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="text-slate-600 space-y-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start gap-8 p-6 bg-white text-slate-900 font-sans"
      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
    >
      <SEO
        title="PlayIncognito | INCØGNITØ - Nigerian University eFootball Tournaments"
        description="INCØGNITØ runs anonymous eFootball tournaments for Nigerian university players. Register, compete, follow leaderboards, and play on a fair campus esports platform."
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "INCØGNITØ",
            alternateName: "PlayIncognito",
            url: "https://www.playincognito.ng",
            logo: "https://www.playincognito.ng/web-icon.png",
            sameAs: [
              "https://instagram.com/playincognitohq",
              "https://x.com/playincognitohq",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: "playincognito.ng@gmail.com",
              telephone: "+2348080433495",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "INCØGNITØ",
            alternateName: "PlayIncognito",
            url: "https://www.playincognito.ng",
          },
        ]}
      />
      {/* Top Section: Logo & Branding */}
      <div className="flex flex-col items-center justify-center w-full mt-12 mb-8">
        <div className="mb-6">
          <img
            src={appIcon}
            alt="INCØGNITØ Logo"
            className="w-24 h-24 object-contain drop-shadow-xl"
          />
        </div>

        <h1 className="text-4xl font-intro tracking-[0.1em] text-slate-900 mb-2">
          INCØGNITØ
        </h1>

        <p className="text-slate-600 text-lg font-medium text-center">
          Play anonymously. Win publicly.
        </p>
      </div>

      {/* Middle Section: Actions */}
      <div className="w-full max-w-md space-y-4 mb-10">
        {isSpectatorEnabled ? (
          <Link to="/leaderboard" className="block w-full">
            <button className="w-full bg-white text-slate-900 border-2 border-slate-200 py-4 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all">
              <div className="text-lg">SPECTATOR</div>
              <div className="text-xs font-normal text-slate-500">
                (Follow the leaderboard)
              </div>
            </button>
          </Link>
        ) : (
          <div className="block w-full">
            <button
              disabled
              className="w-full bg-slate-50 text-slate-400 border-2 border-slate-100 py-4 rounded-xl font-bold cursor-not-allowed opacity-60"
            >
              <div className="text-lg">SPECTATOR</div>
              <div className="text-xs font-normal text-slate-400">
                (Enables once tournament starts)
              </div>
            </button>
          </div>
        )}

        <Link to="/login" className="block w-full">
          <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
            <div className="text-lg">LOGIN</div>
          </button>
        </Link>

        <div className="text-center mt-6">
          <span className="text-slate-500">New here? </span>
          <Link
            to="/register"
            className="text-blue-600 font-semibold hover:underline"
          >
            Register now
          </Link>
        </div>
      </div>


      {/* Bottom Section: Footer Links */}
      <div className="w-full text-center space-y-6 mb-4">
        <div className="flex justify-center gap-6 text-sm text-slate-500 font-medium">
          <button
            onClick={() => setActiveModal("about")}
            className="hover:text-slate-900 transition-colors hover:underline"
          >
            About
          </button>
          <button
            onClick={() => setActiveModal("faq")}
            className="hover:text-slate-900 transition-colors hover:underline"
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveModal("contact")}
            className="hover:text-slate-900 transition-colors hover:underline"
          >
            Contact us
          </button>
          <button
            onClick={() => setActiveModal("socials")}
            className="hover:text-slate-900 transition-colors hover:underline"
          >
            Follow our socials
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "about" && (
        <Modal title="About INCØGNITØ" onClose={() => setActiveModal(null)}>
          <p>
            <strong>INCØGNITØ</strong> is an anonymous, student-focused
            e-football tournament built for pure competition.
          </p>
          <p>
            We created INCØGNITØ to strip away names, reputations, and
            popularity and let skill speak for itself. In this tournament,
            players compete without knowing who they’re facing. No bias. No
            distractions. Just gameplay.
          </p>
          <p>
            INCØGNITØ is designed for Nigerian university students who want
            something different from the usual campus competitions. INCØGNITØ
            1.0 launched in December 2025, and INCØGNITØ 2.0 is set to kick off
            in 2026 — bigger, better, and fully automated. Here, everyone
            competes using an alias, with no real names.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="font-bold mb-2">Our focus is simple:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Competitive integrity</li>
              <li>Anonymity-driven gameplay</li>
              <li>A fun but serious tournament environment</li>
              <li>A community where performance matters more than identity</li>
            </ul>
          </div>

          <p className="font-medium italic text-slate-900 text-center pt-2">
            INCØGNITØ isn’t about fame. It’s about proving yourself,
            anonymously.
          </p>
        </Modal>
      )}

      {activeModal === "contact" && (
        <Modal title="Contact Us" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">
                📞
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Telephone
                </p>
                <a
                  href="tel:+2348080433495"
                  className="font-bold text-slate-900 hover:text-blue-600"
                >
                  +234 808 043 3495
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">
                ✉️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  E-mail
                </p>
                <a
                  href="mailto:playincognito.ng@gmail.com"
                  className="font-bold text-slate-900 hover:text-blue-600"
                >
                  playincognito.ng@gmail.com
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "socials" && (
        <Modal title="Follow Our Socials" onClose={() => setActiveModal(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://instagram.com/playincognitohq"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                IG
              </div>
              <div>
                <p className="text-xs font-bold opacity-80 uppercase">
                  Instagram
                </p>
                <p className="font-bold">@playincognitohq</p>
              </div>
            </a>

            <a
              href="https://x.com/playincognitohq"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-black text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                X
              </div>
              <div>
                <p className="text-xs font-bold opacity-80 uppercase">
                  X (Twitter)
                </p>
                <p className="font-bold">@playincognitohq</p>
              </div>
            </a>
          </div>
        </Modal>
      )}

      {activeModal === "faq" && (
        <Modal title="Frequently Asked Questions" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 pt-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100/80 shadow-sm"
              >
                <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5 leading-snug">
                  {faq.q}
                </h4>
                <div className="text-xs md:text-sm text-slate-650 leading-relaxed font-normal">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Welcome;
