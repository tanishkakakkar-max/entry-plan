import type { Metadata } from "next";
import { BRAND } from "../components/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} admin`,
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
