import { useEffect, useState } from "react";
import { LiveProvider, useLive } from "./lib/store";
import { registrationWindowOpen } from "./config";
import { Icon } from "./components/Icon";
import { ErrorBoundary, UIContext } from "./components/ui";
import { RegisterModal } from "./components/RegisterModal";
import Home from "./pages/Home";
import Live from "./pages/Live";
import TeamPage from "./pages/TeamPage";
import Admin from "./pages/Admin";

// Hash routes work on GitHub Pages without any server setup: #/live, #/team/abc, #/admin
function useRoute() {
  const read = () => (window.location.hash.startsWith("#/") ? window.location.hash.slice(2).split("/") : []);
  const [route, setRoute] = useState<string[]>(read);
  useEffect(() => {
    const on = () => {
      const next = read();
      setRoute(next);
      if (window.location.hash.startsWith("#/")) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

// Always-visible register button, shown while registration is open
function FloatingRegister({ onClick }: { onClick: () => void }) {
  const { state } = useLive();
  if (!state.settings.regOpen || !registrationWindowOpen()) return null;
  return (
    <>
      <div className="h-20 sm:hidden" aria-hidden="true" />
      <button
        onClick={onClick}
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-center gap-3 rounded-full bg-[#b8ef3f] px-7 py-4 font-bold text-[#132116] shadow-[0_12px_32px_rgb(0_0_0/0.28)] ring-1 ring-[#132116]/10 transition hover:scale-[1.03] sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        Claim your spot <Icon name="arrow" />
      </button>
    </>
  );
}

export default function App() {
  const [page, param] = useRoute();
  const [reg, setReg] = useState<{ open: boolean; div?: string }>({ open: false });
  // #/register (from the story QR code) opens the form straight away; any other page closes it
  useEffect(() => setReg({ open: page === "register" }), [page, param]);

  let view;
  if (page === "live") view = <Live tab={param} key={param ?? "live"} />;
  else if (page === "team" && param) view = <TeamPage id={param} />;
  else if (page === "admin") view = <Admin />;
  else view = <Home />; // also covers #/register, which shows the home page with the form open

  return (
    <ErrorBoundary>
      <LiveProvider>
        <UIContext.Provider value={{ openRegistration: (div) => setReg({ open: true, div }) }}>
          {view}
          {page !== "admin" && !reg.open && <FloatingRegister onClick={() => setReg({ open: true })} />}
          {reg.open && <RegisterModal initialDiv={reg.div} onClose={() => {
            setReg({ open: false });
            if (page === "register") history.replaceState(null, "", window.location.pathname);
          }} />}
        </UIContext.Provider>
      </LiveProvider>
    </ErrorBoundary>
  );
}
