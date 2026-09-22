import { PeerServer } from 'peer';

// Render termina o HTTPS. O processo interno escuta HTTP na PORT atribuída.
const port = Number(process.env.PORT || 9000);
PeerServer({
  host: '0.0.0.0',
  port,
  path: '/peerjs',
  key: 'peerjs',
  proxied: true,
  allow_discovery: false,
  concurrent_limit: 100,
}, () => {
  console.log(`PeerServer pronto na porta ${port}; teste em /peerjs`);
});
