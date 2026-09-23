import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { ChincolBird } from "@/components/icons";
import { site } from "@/config/site";
import "../admin.css";

export const metadata: Metadata = { title: "Entrar al administrador", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams;
  return (
    <div className="a-login">
      <div className="a-login__card">
        <span className="a-login__seal">
          <ChincolBird size={34} />
        </span>
        <h1>{site.fullName}</h1>
        <p className="a-muted">Administrador del taller</p>
        <LoginForm volver={volver ?? ""} />
      </div>
    </div>
  );
}
