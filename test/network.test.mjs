import test from 'node:test';
import assert from 'node:assert/strict';
import {networkEndpoints, connectionLinks} from '../public/network.js';
const ip=(address,extra={})=>({address,family:'IPv4',internal:false,...extra});
test('enlaces de LAN excluyen loopback, duplicados e IPv6 sin alcance',()=>{
 const links=networkEndpoints({lo:[ip('127.0.0.1',{internal:true})],en0:[ip('192.168.1.20'),ip('fe80::123',{family:'IPv6'})],en1:[ip('192.168.1.20'),ip('0.0.0.0'),ip('256.1.1.1')]},4173);
 assert.equal(links.length,1);assert.equal(links[0].output,'http://192.168.1.20:4173/output');assert.equal(links[0].test,'http://192.168.1.20:4173/test-obs');
});
test('la red física se presenta antes de VPN y direcciones automáticas',()=>{
 const links=networkEndpoints({utun0:[ip('10.8.0.2')],'vEthernet (WSL)':[ip('172.30.0.1')],'Wi-Fi':[ip('192.168.1.20')],en1:[ip('169.254.1.2')]},4173);
 assert.equal(links[0].name,'Wi-Fi');assert.equal(links.find(i=>i.name==='utun0').virtual,true);assert.equal(links.at(-1).linkLocal,true);
});
test('un panel abierto desde otra PC conserva la IP del emisor y su puerto',()=>{
 const links=connectionLinks({port:4173,addresses:['192.168.1.20']},'http://192.168.1.20:4173');
 assert.equal(links.output,'http://192.168.1.20:4173/output');assert.equal(links.test,'http://192.168.1.20:4173/test-obs');assert.ok(!links.output.includes('localhost'));
});
test('el panel local y los enlaces de LAN se mantienen diferenciados',()=>{
 const links=connectionLinks({port:4173,network:networkEndpoints({en0:[ip('192.168.1.20')]},4173)},'http://localhost:4173');
 assert.equal(links.output,'http://localhost:4173/output');assert.equal(links.endpoints[0].panel,'http://192.168.1.20:4173');
});
