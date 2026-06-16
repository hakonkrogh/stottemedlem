import { greetMember, type Member } from "@stottemedlem/core";

const demoMember: Member = {
  id: "1",
  name: "Ada",
  email: "ada@example.com",
  tier: "patron",
  joinedAt: new Date("2026-01-01"),
};

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Støttemedlem</h1>
      <p>{greetMember(demoMember)}</p>
      <p>
        This value comes from the shared <code>@stottemedlem/core</code> package.
      </p>
    </main>
  );
}
