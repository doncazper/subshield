import { ShieldCheck } from "lucide-react";

export function Brand() {
  return (
    <a className="brand" href="/" aria-label="SubShield home">
      <span className="brand__mark" aria-hidden="true">
        <ShieldCheck size={28} strokeWidth={2} />
      </span>
      <span>SubShield</span>
    </a>
  );
}
