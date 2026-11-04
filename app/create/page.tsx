import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND } from "../components/brand";
import { CreateApp } from "./CreateApp";

export const metadata: Metadata = {
  title: `Create your plan - ${BRAND.name}`,
  description: "Get a free code with 5 plans and create a market-entry plan for Japan, Singapore, India or the United States.",
};

// Create: free code, a 3-step brief, the plan, and Your plans with edit and rerun.
export default function CreatePage() {
  return (
    <Suspense>
      <CreateApp />
    </Suspense>
  );
}
