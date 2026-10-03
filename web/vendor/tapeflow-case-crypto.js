(() => {
  "use strict";
  const enc = new TextEncoder();
  const P = (1n << 255n) - 19n;
  const A24 = 121665n;
  const SECP_N = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
  const HALF_N = SECP_N >> 1n;

  const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let at=0; for(const p of parts){out.set(p,at);at+=p.length} return out };
  const bytesToHex = (b) => "0x" + [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
  const hexToBytes = (h, length) => { const s=String(h).replace(/^0x/,""); if(!/^[0-9a-f]*$/i.test(s)||s.length%2)throw new Error("无效十六进制数据"); const b=Uint8Array.from(s.match(/.{2}/g)?.map(x=>parseInt(x,16))||[]); if(length&&b.length!==length)throw new Error(`数据必须是 ${length} 字节`); return b };
  const uint256 = (v) => { let n=BigInt(v),out=new Uint8Array(32); for(let i=31;i>=0;i--){out[i]=Number(n&255n);n>>=8n} if(n)throw new Error("整数超出256位");return out };
  const addressBytes = (a) => hexToBytes(a,20);
  const mod = (n) => { const r=n%P; return r<0n?r+P:r };
  const pow = (a,n) => { let x=mod(a),r=1n; while(n){if(n&1n)r=mod(r*x);x=mod(x*x);n>>=1n}return r };
  const decodeLE = (b) => { let n=0n; for(let i=b.length-1;i>=0;i--)n=(n<<8n)|BigInt(b[i]); return n };
  const encodeLE = (n) => { const b=new Uint8Array(32); for(let i=0;i<32;i++){b[i]=Number(n&255n);n>>=8n}return b };
  function x25519(secret, point){
    const k=secret.slice();k[0]&=248;k[31]&=127;k[31]|=64;const scalar=decodeLE(k),u=decodeLE(point)&((1n<<255n)-1n);let x1=u,x2=1n,z2=0n,x3=u,z3=1n,swap=0n;
    for(let t=254;t>=0;t--){const kt=(scalar>>BigInt(t))&1n;swap^=kt;if(swap){[x2,x3]=[x3,x2];[z2,z3]=[z3,z2]}swap=kt;const A=mod(x2+z2),AA=mod(A*A),B=mod(x2-z2),BB=mod(B*B),E=mod(AA-BB),C=mod(x3+z3),D=mod(x3-z3),DA=mod(D*A),CB=mod(C*B);x3=mod((DA+CB)**2n);z3=mod(x1*((DA-CB)**2n));x2=mod(AA*BB);z2=mod(E*(AA+A24*E))}
    if(swap){[x2,x3]=[x3,x2];[z2,z3]=[z3,z2]}return encodeLE(mod(x2*pow(z2,P-2n)));
  }
  const publicFromSecret = (secret) => x25519(secret,Uint8Array.of(9,...new Uint8Array(31)));
  const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));
  const normalizeRS = (signature) => {const s=hexToBytes(signature,65),r=s.slice(0,32);let sv=BigInt(bytesToHex(s.slice(32,64)));if(sv>HALF_N)sv=SECP_N-sv;return concat(r,uint256(sv))};
  async function hkdf(ikm,salt,info){const key=await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveBits"]);return new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info},key,256))}
  async function aesEncrypt(key,iv,aad,plain){const k=await crypto.subtle.importKey("raw",key,"AES-GCM",false,["encrypt"]);return new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,plain))}
  async function aesDecrypt(key,iv,aad,cipher){const k=await crypto.subtle.importKey("raw",key,"AES-GCM",false,["decrypt"]);return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,cipher))}
  function inboxKeyText({holder,chainId,escrow}){return [`TapeFlow wants you to sign in with your Ethereum account:`,holder,"","Unlock your TapeFlow encrypted inbox. Anyone who obtains this signature can read your escrow messages. Only sign this inside the official TapeFlow app.","","URI: https://tapeflow.app","Version: 1",`Chain ID: ${BigInt(chainId)}`,"Nonce: tapeflow-inbox-v1","Issued At: 2026-09-26T00:00:00Z","Resources:",`- tapeflow:escrow:${escrow}`].join("\n")}
  async function deriveInboxKeyPair({signature,holder,chainId,escrow}){const info=concat(uint256(chainId),addressBytes(escrow),addressBytes(holder));const secretKey=await hkdf(normalizeRS(signature),enc.encode("TapeFlow/inbox-key/v1"),info);return{secretKey,publicKey:publicFromSecret(secretKey),text:inboxKeyText({holder,chainId,escrow})}}
  const caseContext=({chainId,escrow,caseId,recipient})=>concat(enc.encode("TapeFlow/case-key/v1"),uint256(chainId),addressBytes(escrow),hexToBytes(caseId,32),addressBytes(recipient));
  const messageContext=({chainId,escrow,caseId})=>concat(enc.encode("TapeFlow/case-message/v1"),uint256(chainId),addressBytes(escrow),hexToBytes(caseId,32));
  async function wrapCaseKey({caseKey,recipientPublicKey,chainId,escrow,caseId,recipient}){const e=randomBytes(32),E=publicFromSecret(e),N=randomBytes(12),ctx=caseContext({chainId,escrow,caseId,recipient}),shared=x25519(e,recipientPublicKey);if(shared.every(x=>x===0))throw new Error("无效的收件公钥");const kek=await hkdf(shared,enc.encode("TapeFlow/case-wrap/v1"),concat(E,recipientPublicKey,ctx));return concat(Uint8Array.of(1),E,N,await aesEncrypt(kek,N,ctx,caseKey))}
  async function unwrapCaseKey({envelope,secretKey,chainId,escrow,caseId,recipient}){if(envelope.length!==93||envelope[0]!==1)throw new Error("订单密钥封套格式不支持");const E=envelope.slice(1,33),N=envelope.slice(33,45),C=envelope.slice(45),R=publicFromSecret(secretKey),ctx=caseContext({chainId,escrow,caseId,recipient}),kek=await hkdf(x25519(secretKey,E),enc.encode("TapeFlow/case-wrap/v1"),concat(E,R,ctx));return aesDecrypt(kek,N,ctx,C)}
  async function encryptCaseMessage({caseKey,content,chainId,escrow,caseId}){const N=randomBytes(12),ctx=messageContext({chainId,escrow,caseId});return concat(Uint8Array.of(1),N,await aesEncrypt(caseKey,N,ctx,content))}
  async function decryptCaseMessage({caseKey,payload,chainId,escrow,caseId}){if(payload.length<30||payload[0]!==1)throw new Error("消息密文格式不支持");const N=payload.slice(1,13),ctx=messageContext({chainId,escrow,caseId});return aesDecrypt(caseKey,N,ctx,payload.slice(13))}
  window.TapeFlowCaseCrypto=Object.freeze({inboxKeyText,deriveInboxKeyPair,randomCaseKey:()=>randomBytes(32),wrapCaseKey,unwrapCaseKey,encryptCaseMessage,decryptCaseMessage,bytesToHex,hexToBytes});
})();
