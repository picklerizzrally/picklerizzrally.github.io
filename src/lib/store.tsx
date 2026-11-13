import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth, db } from "../firebase";
import { EVENT } from "../config";
import { emptyState, normalize, uid, type Div, type State } from "./tournament";

type LoadStatus = "loading" | "ready" | "error" | "not-configured";
interface Live {
  state: State;
  status: LoadStatus;
  offline: boolean;
  error: string;
}

const LiveContext = createContext<Live>({ state: emptyState(), status: "loading", offline: false, error: "" });

const stateRef = () => doc(db!, "tournaments", EVENT.tournamentId);
const regCol = () => collection(db!, "tournaments", EVENT.tournamentId, "registrations");

// One listener for the whole app, so a phone keeps a single live connection
export function LiveProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Live>({
    state: emptyState(),
    status: db ? "loading" : "not-configured",
    offline: false,
    error: "",
  });
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      stateRef(),
      { includeMetadataChanges: true },
      (snap) =>
        setLive({
          state: snap.exists() ? normalize(snap.data()) : emptyState(),
          status: "ready",
          offline: snap.metadata.fromCache,
          error: "",
        }),
      (err) => setLive((l) => ({ ...l, status: "error", error: err.message })),
    );
    return unsub;
  }, []);
  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("permission")) return "This account is not allowed to make changes. Check the organiser UID in the security rules.";
  if (msg.includes("offline") || msg.includes("unavailable")) return "No internet connection. Try again when you are back online.";
  return msg;
}

// Every organiser change runs inside a transaction, so two organiser phones never overwrite each other
export async function updateState(mutate: (s: State) => string | void): Promise<string> {
  if (!db) return "Connect Firebase first (see README).";
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(stateRef());
      const s = snap.exists() ? normalize(snap.data()) : emptyState();
      const err = mutate(s);
      if (err) throw new Error(err);
      tx.set(stateRef(), { ...JSON.parse(JSON.stringify(s)), updatedAt: serverTimestamp() });
    });
    return "";
  } catch (e) {
    return friendly(e);
  }
}

/* ---------- registrations ---------- */
export interface RegistrationInput {
  teamName: string;
  player1: string;
  player2: string;
  phone: string;
  email: string;
  division: Div;
  skill: number;
  upiRef: string;
}
export interface Registration extends RegistrationInput {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: { toDate: () => Date } | null;
}

export async function submitRegistration(r: RegistrationInput): Promise<string> {
  if (!db) return "Registration opens once the site is connected to its database.";
  try {
    await addDoc(regCol(), { ...r, status: "pending", createdAt: serverTimestamp() });
    return "";
  } catch (e) {
    return friendly(e).includes("not allowed")
      ? "Some details did not pass our checks. Keep names under 40 characters and use a 10 digit phone number."
      : friendly(e);
  }
}

export function useRegistrations(enabled: boolean) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!db || !enabled) return;
    return onSnapshot(
      query(regCol(), orderBy("createdAt", "desc")),
      (snap) => {
        setDenied(false);
        setRegs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as RegistrationInput & Omit<Registration, "id">) })));
      },
      () => setDenied(true),
    );
  }, [enabled]);
  return { regs, denied };
}

export async function approveRegistration(r: Registration): Promise<string> {
  if (!db) return "Not connected";
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(stateRef());
      const s = snap.exists() ? normalize(snap.data()) : emptyState();
      if (s.teams.some((t) => t.name.toLowerCase() === r.teamName.trim().toLowerCase()))
        throw new Error(`A team called ${r.teamName} already exists. Rename it in Teams first.`);
      s.teams.push({
        id: uid(), name: r.teamName.trim(), p1: r.player1.trim(), p2: r.player2.trim(),
        div: r.division, skill: r.skill, checked: false, regId: r.id,
      });
      tx.set(stateRef(), { ...JSON.parse(JSON.stringify(s)), updatedAt: serverTimestamp() });
      tx.update(doc(regCol(), r.id), { status: "approved" });
    });
    return "";
  } catch (e) {
    return friendly(e);
  }
}

export async function setRegStatus(id: string, status: Registration["status"]) {
  if (!db) return "Not connected";
  try { await updateDoc(doc(regCol(), id), { status }); return ""; } catch (e) { return friendly(e); }
}
export async function deleteRegistration(id: string) {
  if (!db) return "Not connected";
  try { await deleteDoc(doc(regCol(), id)); return ""; } catch (e) { return friendly(e); }
}

/* ---------- organiser login ---------- */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!auth);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); });
  }, []);
  return { user, ready };
}
export async function login(email: string, password: string): Promise<string> {
  if (!auth) return "Connect Firebase first (see README).";
  try { await signInWithEmailAndPassword(auth, email, password); return ""; }
  catch { return "That email and password did not match an organiser account."; }
}
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
