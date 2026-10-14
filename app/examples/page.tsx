import { redirect } from "next/navigation";

// Examples now open in the main form ("See an example"), so the old address sends people there.
export default function ExamplesPage() {
  redirect("/#example");
}
