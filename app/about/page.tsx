import { redirect } from "next/navigation";

// About lives on the home page now.
export default function AboutPage() {
  redirect("/#about");
}
