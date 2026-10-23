// Enlaces calculados en el equipo emisor; las páginas remotas conservan su origen.
export function networkEndpoints(interfaces, port) {
  const entries = [], seen = new Set();
  for (const [name, addresses] of Object.entries(interfaces ?? {})) {
    for (const entry of addresses ?? []) {
      const ip = String(entry.address ?? '');
      const parts = ip.split('.').map(Number);
      if (entry.internal || ![4, 'IPv4'].includes(entry.family) || !/^\d+\.\d+\.\d+\.\d+$/.test(ip) || parts.some(n => n < 0 || n > 255) || parts[0] === 127 || parts[0] === 0 || parts[0] >= 224 || seen.has(ip)) continue;
      seen.add(ip);
      const virtual = /^(utun|tun|tap|docker|veth|vmnet|vbox|virbr|br-|tailscale)|vethernet|virtual|vpn|wsl/i.test(name);
      const linkLocal = parts[0] === 169 && parts[1] === 254;
      const privateIp = parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
      const origin = `http://${ip}:${port}`;
      entries.push({ name, address: ip, virtual, linkLocal, priority: (virtual ? 20 : 0) + (linkLocal ? 40 : 0) + (privateIp ? 0 : 5), output: `${origin}/output`, test: `${origin}/test-obs`, panel: origin });
    }
  }
  entries.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name) || a.address.localeCompare(b.address));
  return entries.map(({priority, ...entry}) => entry);
}

export function connectionLinks(server, origin) {
  const current = new URL(origin);
  const output = `${current.origin}/output`;
  const endpoints = server?.network ?? (server?.addresses ?? []).map(address => ({ name: 'Red local', address, output: `http://${address}:${server.port}/output`, test: `http://${address}:${server.port}/test-obs`, panel: `http://${address}:${server.port}` }));
  return { output, test: `${current.origin}/test-obs`, endpoints };
}
