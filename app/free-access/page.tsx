import { redirect } from "next/navigation";

// Free codes are now on the Create page.
export default function FreeAccessPage() {
  redirect("/create");
}
