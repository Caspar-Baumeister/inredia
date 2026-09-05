import { redirect } from "next/navigation";

// The landing page lives on the marketing domain; app.<domain> goes straight to the app.
export default function Home() {
  redirect("/dashboard");
}
