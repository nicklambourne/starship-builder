import { isSshSession } from "./shared";
import { type ModuleDefinition, optBool } from "./types";

/** Stands in for the address starship reads off a local UDP socket. */
const PLACEHOLDER_IPV4 = "192.168.1.100";

/**
 * `SSH_CONNECTION` is "client_ip client_port server_ip server_port", so its
 * third field is this machine's address — the one value a mocked context can
 * supply honestly.
 */
function localIpv4(env: Record<string, string>): string {
  const fields = env.SSH_CONNECTION?.split(/\s+/) ?? [];
  return fields.length >= 3 ? fields[2] : PLACEHOLDER_IPV4;
}

export const localip: ModuleDefinition = {
  name: "localip",
  defaults: {
    ssh_only: true,
    format: "[$localipv4]($style) ",
    style: "yellow bold",
    disabled: true,
  },
  evaluate(options, ctx) {
    const { scenario } = ctx;
    if (optBool(options, "ssh_only", true) && !isSshSession(scenario)) return null;

    return { variables: { localipv4: localIpv4(scenario.env) } };
  },
};
