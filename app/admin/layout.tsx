import type { Metadata } from "next";
import { BRAND } from "../components/brand";
// The admin page keeps the previous site styles; the public site uses app/globals.css.
import "./legacy.css";

export const metadata: Metadata = {
  title: `${BRAND.name} admin`,
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
