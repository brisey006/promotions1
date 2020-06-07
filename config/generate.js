const rsa = new NodeRSA({ b: 1024 });
const publicKey = rsa.exportKey('public');
const privateKey = rsa.exportKey('private');

fs.writeFileSync('config/.public.pem', publicKey);
fs.writeFileSync('config/.private.pem', privateKey);
console.log('private key done');