import { networkInterfaces } from 'node:os';

/** Interfaces virtuelles (Docker, machines virtuelles, VPN) : rarement celles du Wi-Fi de la maison. */
const VIRTUAL = /docker|vbox|virtualbox|vmware|vethernet|wsl|utun|tailscale|zerotier|hyper-v|^br-|^veth/i;

/**
 * Adresses IPv4 de cet ordinateur sur le réseau local (Wi-Fi, Ethernet), la plus probable en
 * premier : c'est l'adresse que les téléphones des amis doivent ouvrir.
 */
export function lanAddresses(): string[] {
  const found: { ip: string; score: number }[] = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      const ip = a.address;
      const range = ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
      found.push({ ip, score: range + (VIRTUAL.test(name) ? 10 : 0) });
    }
  }
  return found.sort((a, b) => a.score - b.score).map((a) => a.ip);
}

export function lanUrls(port: number): string[] {
  return lanAddresses().map((ip) => `http://${ip}${port === 80 ? '' : `:${port}`}`);
}
