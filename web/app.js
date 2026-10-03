(async () => {
  "use strict";
  const E = window.ethers;
  const CFG = window.TAPEFLOW_X_CONFIG;
  const P3 = Object.freeze({entrypoint:CFG.contracts.privacy,pool:CFG.contracts.privacyPool,deploymentBlock:Number(CFG.contracts.privacyDeploymentBlock||0),relayer:CFG.services?.privacyRelayer||"",asp:CFG.services?.privacyAsp||""});
  const ZERO = E.ZeroAddress;
  const $ = (id) => document.getElementById(id);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const KEY = "tapeflow-x-settings-v3";
  const TOKEN_KEY = "tapeflow-x-tokens-v1";
  const SECRET_KEY = "tapeflow-x-secrets-v1";
  const OIDC_FLOW_KEY = "tapeflow-x-oidc-flow-v1";
  const OIDC_TOKEN_KEY = "tapeflow-x-oidc-token-v1";
  const WALLET_DISCONNECTED_KEY = "tapeflow-x-wallet-disconnected-v1";
  const titleMap = {home:"首页",pay:"付款",receive:"收款码",packet:"红包",escrow:"担保付款",schedule:"定时付款",lock:"条件锁仓",veil:"隐私支付",cross:"跨链支付",receipt:"履约消息",merchant:"商户/API",settings:"设置"};
  const EN = {
    "首页":"Home","付款":"Pay","收款":"Receive","收款码":"Receive QR","红包":"Packets","担保":"Escrow","定时":"Schedule","隐私":"Privacy","跨链":"Omnichain","商户/API":"Merchant / API","合约与设置":"Contracts & Settings","连接钱包":"Connect wallet","让价值在 Tape 生态中流动":"Let value flow through the Tape ecosystem",
    "一个入口，完成每一种链上支付":"One place for every onchain payment","OKB、任意 X Layer 代币、电路容器、红包、担保、定时、隐私与跨链支付。":"OKB, any X Layer token, circuit containers, packets, escrow, scheduled, private and cross-chain payments.","立即付款":"Pay now","生成收款码":"Create payment QR","当前钱包":"Wallet","尚未连接":"Not connected","网络":"Network","刷新":"Refresh",
    "转账付款":"Transfer","地址或电路容器直接到账":"Pay a wallet or circuit container","扫码收款":"QR receive","收款人无需连接钱包":"Recipient stays offline","发红包":"Send packets","普通、随机、指定、口令":"Equal, lucky, directed, password","担保付款":"Escrow payment","交付后释放，超时可退款":"Release after delivery; refund after expiry","加密订单与隐身地址":"Encrypted orders and stealth addresses","跨链支付":"Cross-chain pay","支付意图与Solver结算":"Payment intents with solver settlement",
    "付款币种":"Token","接收地址或容器地址":"Wallet or container address","金额":"Amount","订单号或备注":"Order ID or note","使用 TapeFlow 支付中心":"Use TapeFlow Hub","确认付款":"Review payment","收款地址或容器地址":"Receiving wallet or container","使用我的钱包":"Use my wallet","订单号/备注":"Order ID / note","添加X Layer代币":"Add X Layer token","代币合约地址":"Token contract address","读取并添加":"Read and add",
    "普通红包":"Equal packet","每人金额相同":"Same amount per claimant","随机红包":"Lucky packet","链上可验证随机":"Verifiable onchain randomness","指定红包":"Directed packet","只有指定地址可领":"Only the selected address can claim","口令红包":"Password packet","承诺后再揭示领取":"Commit, then reveal and claim","红包币种":"Packet token","每份金额":"Amount per claim","红包份数":"Number of claims","有效时间":"Valid for","祝福语":"Message","红包总额":"Total","创建并分享":"Create & share","领取红包":"Claim packet","打开链接时会自动加载":"Loads automatically from a shared link","查询":"Load","等待红包":"Waiting for a packet","输入红包码或打开分享链接":"Enter a packet code or open a shared link","立即领取":"Claim now","退回未领取余额":"Refund unclaimed balance",
    "创建担保订单":"Create escrow","订单管理":"Order management","查询并执行":"Load and execute","标记已交付":"Mark delivered","确认放款":"Release payment","发起争议":"Open dispute","超时退款":"Expired refund","创建定时付款":"Create scheduled payment","定时任务":"Scheduled payment","领取或取消":"Claim or cancel","到期领取":"Claim when due","取消并退款":"Cancel & refund",
    "加密订单":"Encrypted order","隐身地址":"Stealth address","隐藏金额与路径":"Shielded pool","生成加密付款码":"Create encrypted QR","发送隐身付款":"Send stealth payment","配置隐私适配器":"Configure privacy adapter","创建跨链支付意图":"Create cross-chain intent","付款链接":"Payment link","验证到账":"Verify settlement","AI Agent付款":"AI Agent payment","保存设置":"Save settings","恢复空配置":"Reset config"
  };
  Object.assign(EN,{
    "履约消息":"Receipts","加密履约消息":"Encrypted fulfillment messages","商户付 Gas":"Merchant pays gas","X Layer DeWEB Hub 已接入":"X Layer DeWEB Hub connected","当前实现已核对":"Implementation verified","尚未封印":"Not sealed",
    "发送业务收据":"Send business receipt","发件商户钱包确认并支付 OKB Gas":"Merchant wallet confirms and pays OKB gas","商户发件电路":"Merchant sender circuit","收件链":"Recipient chain","用户收件端点":"Recipient endpoint","业务类型":"Event type","业务编号":"Reference","消息标题":"Subject","加密正文":"Encrypted body","只允许端到端加密":"Require end-to-end encryption","核验端点并发送":"Verify endpoints & send","一次付款，持续履约":"One payment, continuous fulfillment",
    "真正的资金池模式":"Real shielded-pool mode","存入隐私池":"Deposit to privacy pool","本机生成承诺，钱包仅提交承诺值":"Generate commitment locally; wallet submits only the commitment","资产":"Asset","存入金额":"Deposit amount","我会先备份恢复文件":"I will back up the recovery file first","生成承诺并存款":"Generate commitment & deposit","私密转出":"Private withdrawal","本地生成证明，Relayer提交":"Generate proof locally; submit through relayer","收款钱包或容器":"Receiving wallet or container","转出金额":"Withdrawal amount","恢复文件":"Recovery file","生成证明并由Relayer转出":"Generate proof & relay withdrawal","上线门槛（全部通过才开放资金）":"Launch gates (all required before deposits)","未配置":"Not configured","已配置":"Configured",
    "免连接领取":"Walletless claim","到账地址":"Destination address","登录并免Gas领取":"Sign in & claim gaslessly","红包登录领取服务":"Packet login claim service","登录服务 Issuer":"Login issuer","登录应用 Client ID":"Login app client ID","登录 API Audience":"Login API audience","隐私 Relayer":"Privacy relayer","隐私 Prover":"Privacy prover",
    "锁仓":"Lock","条件锁仓":"Conditional locks","时间或价格达标后释放":"Release when time or price conditions are met","给自己锁仓":"Lock for myself","到期前不能操作":"Unavailable until released","赠送锁仓":"Locked gift","到期直接给对方":"Released directly to the recipient","给自己锁仓，或把一份带释放条件的资产赠送给别人。":"Lock assets for yourself or send someone a gift with clear release rules.","不可撤回 · 受益人固定":"Irrevocable · Fixed beneficiary","创建自己的锁仓":"Create my lock","创建赠送锁仓":"Create locked gift","创建后不能修改、取消或提前取出":"Cannot be changed, cancelled or withdrawn early","锁仓币种":"Locked token","锁仓数量":"Amount to lock","＋ 添加":"＋ Add","被赠送人钱包或容器地址":"Recipient wallet or container","资产只能释放到这个地址，创建后不能更改":"Assets can only be released to this address; it cannot be changed","什么时候可以解锁":"Release rule","到达指定时间":"At a chosen time","价格达到目标":"When price reaches a target","时间和价格都满足":"When both time and price pass","时间或价格满足一个":"When either time or price passes","最早解锁时间":"Earliest release time","价格来源":"Price source","等待配置已核验价格源":"Waiting for a verified price source","已核验":"Verified","价格条件":"Price condition","价格达到或高于":"Price at or above","价格达到或低于":"Price at or below","目标价格（USD）":"Target price (USD)","二次确认间隔":"Second confirmation delay","30分钟":"30 minutes","1小时":"1 hour","4小时":"4 hours","24小时":"24 hours","最晚强制解锁":"Final fallback release","价格条件需要两次有效报价确认；没有已核验价格源的代币，只能使用时间锁。":"Price release requires two valid oracle observations. Tokens without a verified source can only use time locks.","备注":"Note","受益人随时可查":"Always visible to the beneficiary","查询不需要连接钱包；到期后任何人可触发，资产只会进入受益地址。":"Lookup needs no wallet connection. Anyone can trigger a matured lock, but assets only go to the beneficiary.","核对并创建锁仓":"Review & create lock","查询收到的锁仓":"Find locks received","输入钱包或容器地址即可查询，不需要连接或签名。":"Enter a wallet or container address. No connection or signature required.","受益地址":"Beneficiary address","我的地址":"My address","查询锁仓资产":"Find locked assets","等待查询":"Waiting for lookup","最多显示最近20笔锁仓":"Shows the 20 most recent locks","按锁仓编号查询":"Find by lock ID","锁仓编号":"Lock ID","暂无锁仓记录":"No lock selected","释放到受益地址":"Release to beneficiary","检查价格条件":"Check price condition"
  });
  Object.assign(EN,{
    "资金由合约托管，订单沟通与证据通过 TapeSend 端到端加密传递。":"Funds are held by contract; order messages and evidence are end-to-end encrypted with TapeSend.","三方可验证":"Three-party verifiable","买方锁定资金":"Buyer locks funds","没有指定仲裁者时，默认由 TapeFlow 仲裁":"TapeFlow arbitrates by default when no arbiter is selected","双方加密沟通":"Encrypted order chat","争议前仅买卖双方收到消息":"Only buyer and seller receive messages before a dispute","争议后仲裁":"Arbitration after dispute","仲裁者此时进入案件并收到证据":"The arbiter joins the case and receives evidence only after a dispute","创建担保":"CREATE ESCROW","付款并建立订单":"Fund and create order","卖方收款钱包":"Seller wallet","我的 TapeSend 发件电路":"My TapeSend sender circuit","卖方 TapeSend 收件端点":"Seller TapeSend endpoint","指定仲裁者钱包":"Appointed arbiter wallet","交付期限":"Delivery deadline","买方验收时间":"Buyer review window","卖方标记交付后开始；到期未争议可自动放款":"Starts after delivery; funds can release automatically if undisputed","我的订单":"MY ORDERS","连接钱包即可查询":"Connect wallet to view","买方和卖方随时查看订单状态；仲裁者只会看到已经进入争议的案件。":"Buyer and seller can always track the order. Arbiters see only disputed cases.","读取我的担保订单":"Load my escrow orders","按订单编号查询":"Find by order ID","订单进度":"ORDER PROGRESS","验收期后放款":"Release after review","未交付退款":"Refund undelivered","TAPESEND 私密沟通":"TAPESEND PRIVATE CHAT","订单消息与证据":"Order messages and evidence","加密可见范围":"Encrypted audience","消息类型":"Message type","消息内容":"Message","证据文件或链接说明":"Evidence file or link note","加密发送并登记摘要":"Encrypt, send and anchor digest","链上消息摘要":"ONCHAIN MESSAGE DIGESTS","可验证沟通记录":"Verifiable communication record","正文保存在 TapeSend 加密消息中；这里仅显示发送者、时间和不可逆摘要。":"Message bodies stay encrypted in TapeSend. Only sender, time and immutable digest are shown here.","仲裁者无法处理？":"ARBITER UNAVAILABLE?","共同改由 TapeFlow 仲裁":"Jointly switch to TapeFlow arbitration","买方与卖方必须分别连接自己的钱包确认。两边都同意后，仲裁权才会切换。":"Buyer and seller must confirm separately. Authority switches only after both approve.","我同意改由 TapeFlow 仲裁":"I agree to switch to TapeFlow","仲裁者工作台":"ARBITER WORKBENCH","裁决争议订单":"Resolve disputed order","仅当前仲裁钱包可提交":"Current arbiter wallet only","请先在 TapeSend 阅读双方的加密陈述和证据，再决定资金分配。裁决提交后立即结算，不能撤回。":"Review both encrypted statements and evidence in TapeSend before allocating funds. A submitted ruling settles immediately and cannot be reversed.","争议已满15天 · TapeFlow接入仲裁":"15 days elapsed · TapeFlow joins arbitration","退还买方":"Refund buyer","支付卖方":"Pay seller","裁决理由":"Ruling reason","核对并提交裁决":"Review and submit ruling"
  });
  Object.assign(EN,{
    "钱包加密信箱":"Wallet encrypted inbox","没有电路也能发送加密订单消息。首次签名后，本标签页 30 分钟内刷新可自动恢复；密钥不会上传服务器。":"Send encrypted order messages without a circuit. After the first signature, this tab can restore access for 30 minutes; keys are never uploaded to the server.","尚未检查":"Not checked","开通 / 解锁信箱":"Enable / unlock inbox","立即锁定":"Lock now","关闭标签页、切换钱包、超过 30 分钟或立即锁定后，需要重新签名。":"Sign again after closing the tab, switching wallets, 30 minutes, or locking now.","可选：同时发送原生 TapeSend 副本":"Optional: also send a native TapeSend copy","留空不影响钱包加密信箱":"Leave blank to use only the wallet inbox","可选：发送原生 TapeSend 副本":"Optional: send a native TapeSend copy","留空则只使用钱包加密信箱":"Leave blank to use only the wallet inbox","加密发送":"Send encrypted","链上只保存认证密文。买卖双方可解密全部历史；争议发生后，发起方把订单密钥加密授权给仲裁者。":"Only authenticated ciphertext is stored onchain. Buyer and seller can decrypt the full history; after a dispute, the opener encrypts and grants the order key to the arbiter.","授权仲裁者读取完整历史":"Grant arbiter full history access"
  });
  Object.assign(EN,{"备用仲裁通道":"BACKUP ARBITRATION ROUTE","切换规则":"SWITCHING RULE","两次独立钱包确认，缺一不可。切换后，当前指定仲裁者将不再负责本案。":"Two independent wallet approvals are required. After switching, the appointed arbiter will no longer handle this case.","仅在指定仲裁者无法继续处理时使用":"Use only when the appointed arbiter cannot continue","当前钱包已确认，等待另一方":"This wallet has approved; waiting for the other party","买方确认":"Buyer approval","卖方确认":"Seller approval","尚未确认":"Not yet approved"});
  Object.assign(EN,{"发起争议":"OPEN DISPUTE","填写争议原因":"Describe the issue","请简单说明交付哪里有问题。提交后，仲裁者会看到此原因和已有沟通记录。":"Briefly explain what is wrong with the delivery. The arbiter will receive this reason and the existing case history.","争议原因（必填）":"Reason for dispute (required)","证据说明（选填）":"Evidence note (optional)","下一步：核对并发起争议":"Next: review and open dispute"});
  Object.assign(EN,{
    "BudgetGuard 多资产支付保护":"BudgetGuard multi-asset protection","每个钱包、每种代币分别设置；最终放行由 X Layer TapeOut 电路执行":"Separate rules per wallet and token; final approval is enforced by the X Layer TapeOut circuit","需要保护的币种":"Protected token","当前规则":"Current rules","连接钱包后读取":"Connect wallet to load","未读取链上预算":"Onchain budget not loaded","单笔最高金额":"Maximum per payment","超过此金额，付款交易会被电路拒绝":"Payments above this amount are rejected by the circuit","每日最高金额":"Daily maximum","按 UTC 自然日累计":"Resets by UTC day","仅允许白名单收款地址":"Only allow approved recipients","开启后，没有单独加入的地址都不能收款":"When enabled, unlisted recipients are rejected","读取当前规则":"Load current rules","保存限额规则":"Save limits","收款白名单地址":"Recipient allowlist address","允许该地址":"Allow this address","取消勾选表示从白名单移除":"Uncheck to remove it from the allowlist","保存白名单地址":"Save recipient","暂停这个币种的 TapeFlow 付款":"Pause TapeFlow payments for this token","冻结只影响当前钱包和所选币种，解除后恢复":"Only affects this wallet and token; unfreeze to resume","保存冻结状态":"Save pause state","修改限额会从零重新开始当天累计；设为 0 表示不限额。白名单、限额和冻结都不会把资产转入合约。":"Changing limits restarts today's counter. Zero means unlimited. These rules never transfer assets into the policy contract."
  });
  Object.assign(EN,{"价格源运营":"Price publisher","OKB/USD 采用 OKX 与 Gate 双来源报价；发布器只负责签名报价，不能转移用户资产。":"OKB/USD uses OKX and Gate quotes. The publisher can only sign prices and cannot move user funds.","服务器价格签名者":"Server price signer","链上授权":"Onchain authorization","最新 OKB/USD":"Latest OKB/USD","当前钱包权限":"Current wallet role","授权价格签名者":"Authorize price signer","连接管理员钱包授权":"Connect admin wallet to authorize","仅管理员钱包可授权":"Only the admin wallet can authorize"});
  Object.assign(EN,{"已连接的钱包":"Connected wallet","当前地址":"Current address","复制钱包地址":"Copy wallet address","断开钱包连接":"Disconnect wallet","只断开 TapeFlow 当前会话，不会删除浏览器钱包中的账户或资产。":"Disconnects only this TapeFlow session. It never removes accounts or assets from your browser wallet."});
  const HUB_ABI = [
    "event PacketCreated(uint256 indexed packetId,address indexed creator,address indexed token,uint8 kind,uint256 total,uint32 maxClaims,uint64 deadline,bytes32 metadataHash)",
    "event Scheduled(uint256 indexed scheduleId,address indexed payer,address indexed payee,address token,uint256 amount,uint64 releaseTime,bool cancelable,bytes32 metadataHash)",
    "function payNative(address recipient,bytes32 referenceId,address policy,bytes policyData) payable",
    "function payToken(address token,address recipient,uint256 amount,bytes32 referenceId,address policy,bytes policyData)",
    "function payStealthNative(uint256 schemeId,address stealthAddress,uint256 amount,bytes ephemeralPubKey,bytes metadata) payable",
    "function payStealthToken(uint256 schemeId,address token,address stealthAddress,uint256 amount,bytes ephemeralPubKey,bytes metadata)",
    "function createEqualPacket(address token,uint96 amountPerClaim,uint32 maxClaims,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function createDirectedPacket(address token,address recipient,uint128 total,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function createLuckyPacket(address token,uint128 total,uint32 maxClaims,uint64 deadline,bytes32 seedCommitment,bytes32 metadataHash) payable returns(uint256)",
    "function createPasswordPacket(address token,bytes32 passwordHash,bytes32 passwordSalt,uint96 amountPerClaim,uint32 maxClaims,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function revealLucky(uint256 packetId,bytes32 secret)","function activateLucky(uint256 packetId,bytes32 secret)",
    "function claimEqual(uint256 packetId)","function claimDirected(uint256 packetId)","function claimLucky(uint256 packetId)",
    "function commitPassword(uint256 packetId,bytes32 commitment)","function revealPassword(uint256 packetId,bytes32 passwordDigest)","function refundPacket(uint256 packetId)",
    "function packets(uint256) view returns(address creator,address token,address directedTo,uint128 remaining,uint96 amountPerClaim,uint64 deadline,uint64 createdBlock,uint32 maxClaims,uint32 claimCount,uint8 kind,bytes32 secretHash,bytes32 randomSeed,bytes32 passwordSalt,bytes32 metadataHash)",
    "function createEscrow(address token,address payee,address arbiter,uint128 amount,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function markDelivered(uint256)","function releaseEscrow(uint256)","function refundEscrow(uint256)","function disputeEscrow(uint256)",
    "function escrows(uint256) view returns(address payer,address payee,address arbiter,address token,uint128 amount,uint64 deadline,uint8 status,bytes32 metadataHash)",
    "function createSchedule(address token,address payee,uint128 amount,uint64 releaseTime,bool cancelable,bytes32 metadataHash) payable returns(uint256)",
    "function claimSchedule(uint256)","function cancelSchedule(uint256)",
    "function nextScheduleId() view returns(uint256)",
    "function schedules(uint256) view returns(address payer,address payee,address token,uint128 amount,uint64 releaseTime,bool cancelable,bool claimed,bool cancelled,bytes32 metadataHash)"
  ];
  const ESCROW_ABI = [
    "event EscrowCreated(uint256 indexed escrowId,address indexed payer,address indexed payee,address token,uint256 amount,uint256 serviceFee,uint256 arbiterReward,uint64 deliveryDeadline,uint64 reviewPeriod,address arbiter,bytes32 payerEndpoint,bytes32 payeeEndpoint,bytes32 arbiterEndpoint,bytes32 caseId,bytes32 metadataHash)",
    "event EscrowStatusChanged(uint256 indexed escrowId,uint8 status,address indexed actor,uint64 timestamp)",
    "event EscrowMessageAnchored(uint256 indexed escrowId,address indexed sender,uint8 kind,bytes32 indexed tapeSendRef,bytes32 contentHash,uint64 timestamp)",
    "event ArbiterChanged(uint256 indexed escrowId,address indexed previousArbiter,address indexed newArbiter,bytes32 newEndpoint)",
    "function defaultArbiter() view returns(address)",
    "function defaultArbiterEndpoint() view returns(bytes32)",
    "function registerInboxKey(bytes32 publicKey)",
    "function inboxPublicKey(address) view returns(bytes32)",
    "function createEscrow(address token,address payee,address arbiter,uint128 amount,uint128 arbiterReward,uint64 deliveryDeadline,uint64 reviewPeriod,bytes32 metadataHash,bytes32 payerEndpoint,bytes32 payeeEndpoint,bytes32 arbiterEndpoint,bytes32 caseId,bytes payerKeyEnvelope,bytes payeeKeyEnvelope) payable returns(uint256)",
    "function markDelivered(uint256 escrowId,bytes32 tapeSendRef,bytes32 proofHash)",
    "function releaseEscrow(uint256 escrowId)",
    "function finalizeAfterReview(uint256 escrowId)",
    "function refundUndelivered(uint256 escrowId)",
    "function openDispute(uint256 escrowId,bytes32 tapeSendRef,bytes32 evidenceHash)",
    "function anchorMessage(uint256 escrowId,uint8 kind,bytes32 tapeSendRef,bytes32 contentHash)",
    "function grantCaseKey(uint256 escrowId,address grantee,bytes envelope)",
    "function caseKeyEnvelope(uint256 escrowId,address reader) view returns(bytes)",
    "function hasCaseKeyEnvelope(uint256 escrowId,address reader) view returns(bool)",
    "function postEncryptedMessage(uint256 escrowId,uint8 kind,bytes ciphertext,bytes32 tapeSendRef)",
    "function encryptedMessageCount(uint256 escrowId) view returns(uint256)",
    "function encryptedMessageAt(uint256 escrowId,uint256 index) view returns(tuple(address sender,uint8 kind,bytes32 tapeSendRef,bytes32 ciphertextHash,uint64 timestamp,bytes ciphertext))",
    "function approveTapeFlowFallback(uint256 escrowId)",
    "function activateTapeFlowIntervention(uint256 escrowId)",
    "function resolveEscrow(uint256 escrowId,uint128 payerAmount,uint128 payeeAmount,bytes32 reasonHash)",
    "function escrows(uint256) view returns(address payer,address payee,address arbiter,address token,uint128 amount,uint128 serviceFee,uint128 arbiterReward,uint64 deliveryDeadline,uint64 reviewPeriod,uint64 createdAt,uint64 deliveredAt,uint64 disputedAt,uint64 closedAt,uint8 status,bytes32 metadataHash,bytes32 payerEndpoint,bytes32 payeeEndpoint,bytes32 arbiterEndpoint,bytes32 caseId)",
    "function fallbackApproval(uint256,address) view returns(bool)",
    "function tapeFlowIntervened(uint256) view returns(bool)",
    "function payerEscrowCount(address) view returns(uint256)",
    "function payerEscrowAt(address,uint256) view returns(uint256)",
    "function payeeEscrowCount(address) view returns(uint256)",
    "function payeeEscrowAt(address,uint256) view returns(uint256)",
    "function arbiterDisputeCount(address) view returns(uint256)",
    "function arbiterDisputeAt(address,uint256) view returns(uint256)",
    "function disputeCount() view returns(uint256)",
    "function disputeAt(uint256) view returns(uint256)",
    "function messageCount(uint256) view returns(uint256)",
    "function messageAt(uint256,uint256) view returns(address sender,uint8 kind,bytes32 tapeSendRef,bytes32 contentHash,uint64 timestamp)"
  ];
  const INTENT_ABI = [
    "event IntentCreated(uint256 indexed intentId,address indexed payer,address indexed recipient,uint64 destinationChainId,address sourceToken,uint256 sourceAmount,address destinationToken,uint256 minimumDestinationAmount,uint64 deadline)",
    "function createIntent(address sourceToken,uint128 sourceAmount,uint64 destinationChainId,address destinationRecipient,address destinationToken,uint128 minimumDestinationAmount,uint64 deadline) payable returns(uint256)",
    "function refund(uint256 intentId)",
    "function intents(uint256) view returns(address payer,address sourceToken,uint128 sourceAmount,uint64 destinationChainId,address destinationRecipient,address destinationToken,uint128 minimumDestinationAmount,uint64 deadline,uint8 status,address solver,bytes32 destinationProofHash)"
  ];
  const PACKET_V2_ABI = [
    "event PacketCreated(uint256 indexed packetId,address indexed creator,address indexed token,uint8 kind,uint256 total,uint256 serviceFee,uint32 maxClaims,uint64 deadline,bytes32 metadataHash)",
    "function createEqualPacket(address token,uint96 amountPerClaim,uint32 maxClaims,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function createDirectedPacket(address token,address recipient,uint128 total,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function createLuckyPacket(address token,uint128 total,uint32 maxClaims,uint64 deadline,bytes32 seedCommitment,bytes32 metadataHash) payable returns(uint256)",
    "function createPasswordPacket(address token,bytes32 passwordHash,bytes32 passwordSalt,uint96 amountPerClaim,uint32 maxClaims,uint64 deadline,bytes32 metadataHash) payable returns(uint256)",
    "function revealLucky(uint256 packetId,bytes32 secret)","function activateLucky(uint256 packetId,bytes32 secret)",
    "function claimEqual(uint256 packetId)","function claimDirected(uint256 packetId)","function claimLucky(uint256 packetId)","function claimPassword(uint256 packetId,bytes32 passwordDigest)","function refundPacket(uint256 packetId)",
    "function claimedAddress(uint256 packetId,address claimant) view returns(bool)",
    "function packets(uint256) view returns(address creator,address token,address directedTo,uint128 remaining,uint96 amountPerClaim,uint64 deadline,uint64 createdBlock,uint32 maxClaims,uint32 claimCount,uint8 kind,bytes32 secretHash,bytes32 randomSeed,bytes32 passwordSalt,bytes32 metadataHash)"
  ];
  const LOCK_ABI = [
    "event LockCreated(uint256 indexed lockId,address indexed creator,address indexed beneficiary,address token,uint256 amount,uint8 condition,uint64 unlockTime,uint64 fallbackTime,uint256 targetPriceE18,uint8 direction,uint32 confirmationDelay,bytes32 metadataHash)",
    "function createLock(address token,address beneficiary,uint256 amount,uint64 unlockTime,uint64 fallbackTime,uint8 condition,uint8 direction,uint192 targetPriceE18,uint32 confirmationDelay,bytes32 metadataHash) payable returns(uint256)",
    "function checkPrice(uint256 lockId) returns(bool conditionMet,uint256 priceE18,uint256 oracleUpdatedAt)",
    "function claim(uint256 lockId)",
    "function status(uint256 lockId) view returns(bool claimable,bool timeMet,bool priceMet,bool priceConfirmed,uint256 currentPriceE18)",
    "function locks(uint256) view returns(address creator,address beneficiary,address token,uint256 amount,uint192 targetPriceE18,uint64 unlockTime,uint64 fallbackTime,uint64 priceFirstConfirmedAt,uint32 confirmationDelay,uint8 condition,uint8 direction,bool claimed,bytes32 metadataHash)",
    "function beneficiaryLockCount(address beneficiary) view returns(uint256)",
    "function beneficiaryLockAt(address beneficiary,uint256 index) view returns(uint256)",
    "function ORACLE() view returns(address)"
  ];
  const PRICE_ORACLE_ABI = [
    "function ADMIN() view returns(address)",
    "function isSigner(address) view returns(bool)",
    "function setSigner(address,bool)",
    "function readPrice(address) view returns(uint256 priceE18,uint256 updatedAt)"
  ];
  const ERC20_ABI = ["function name() view returns(string)","function symbol() view returns(string)","function decimals() view returns(uint8)","function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)","function approve(address,uint256) returns(bool)"];
  const BUDGET_POLICY_ABI = [
    "function setBudget(address token,uint128 singleLimit,uint128 dailyLimit,bool enableAllowlist)",
    "function setRecipient(address token,address recipient,bool allowed)",
    "function setFrozen(address token,bool value)",
    "function budgets(address payer,address token) view returns(uint128 singleLimit,uint128 dailyLimit,uint128 spentToday,uint64 day,bool frozen)",
    "function recipientAllowed(address payer,address token,address recipient) view returns(bool)",
    "function usesAllowlist(address payer,address token) view returns(bool)",
    "function validate(address payer,address token,address recipient,uint256 amount,bytes32 referenceId,bytes policyData) returns(bool)"
  ];

  let browserProvider, publicProvider, signer, account = "", activeWalletProvider, remoteWalletProvider, okxUiPromise, packetKind = "equal", activePacketGeneration = "v4", lockKind = "self", confirmAction, scanStream, activeEscrow, inboxIdentity, inboxExpiryTimer, tokenTargetSelect, budgetLoadedToken = "", budgetLoadedFrozen = null, relayerCapabilities = {};
  const caseKeys = new Map();
  const INBOX_SESSION_KEY="tapeflow-x-inbox-session-v1",INBOX_SESSION_MS=30*60*1000;
  const savedSettings = readJSON(KEY,{});
  if(String(savedSettings.packetV2||"").toLowerCase()==="0x29ce9fb40f65e90b4ba6da3da26deb1e7a492c7c")delete savedSettings.packetV2;
  const supersededPacketV2 = "0xd9e8e9f2ba084e55093908ad337f8ed1c9b268eb";
  if(String(savedSettings.packetV2||"").toLowerCase()===supersededPacketV2){
    savedSettings.packetV2=CFG.contracts.packetV2;
    saveJSON(KEY,savedSettings);
  }
  if(String(savedSettings.packetV2||"").toLowerCase()===String(CFG.contracts.packetLegacyV3||"").toLowerCase()){
    savedSettings.packetV2=CFG.contracts.packetV2;
    saveJSON(KEY,savedSettings);
  }
  let settings = {...CFG.contracts, ...(CFG.services || {}), ...Object.fromEntries(Object.entries(savedSettings).filter(([,value])=>value!==""&&value!==null&&value!==undefined))};
  let tokens = [{address:ZERO,name:"OKB",symbol:"OKB",decimals:18}, ...readJSON(TOKEN_KEY,CFG.tokens || [])];
  tokens = tokens.filter((v,i,a)=>a.findIndex(x=>x.address.toLowerCase()===v.address.toLowerCase())===i);

  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
  function saveJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
  const PACKET_CODE_MOD=36n**10n,PACKET_CODE_MULTIPLIER=987654319876543n,PACKET_CODE_OFFSET=178349512334721n,PACKET_CODE_INVERSE=483828891076159n;
  function short(a){return a ? `${a.slice(0,6)}…${a.slice(-4)}` : "未连接"}
  function packetCompact(packetId){
    const id=BigInt(packetId);if(id<=0n||id>=PACKET_CODE_MOD)throw new Error("红包编号超出支持范围");
    return ((id*PACKET_CODE_MULTIPLIER+PACKET_CODE_OFFSET)%PACKET_CODE_MOD).toString(36).toUpperCase().padStart(10,"0")
  }
  function packetCode(packetId,generation="v4"){const compact=packetCompact(packetId),prefix=generation==="v3"?"TFX3":"TFX4";return `${prefix}-${compact.slice(0,4)}-${compact.slice(4,8)}-${compact.slice(8)}`}
  function base36BigInt(value){let result=0n;for(const char of value){const digit=BigInt(parseInt(char,36));if(digit<0n||digit>=36n)throw new Error("红包码格式不正确");result=result*36n+digit}return result}
  function packetRefFromValue(value){
    const raw=String(value??"").trim();if(!raw)throw new Error("请输入红包码");if(/^\d+$/.test(raw))return{id:BigInt(raw).toString(),generation:"v3"};
    const upper=raw.toUpperCase(),generation=/^TFX4[-\s]*/.test(upper)?"v4":"v3",compact=upper.replace(/^TFX[34]?[-\s]*/,"").replace(/[-\s]/g,"");if(!/^[0-9A-Z]{10}$/.test(compact))throw new Error("红包码格式不正确");
    const mixed=base36BigInt(compact),id=(((mixed-PACKET_CODE_OFFSET+PACKET_CODE_MOD)%PACKET_CODE_MOD)*PACKET_CODE_INVERSE)%PACKET_CODE_MOD;
    if(id<=0n||packetCompact(id)!==compact)throw new Error("红包码格式不正确");return{id:id.toString(),generation}
  }
  function currentPacketId(){const ref=packetRefFromValue($("packet-id").value);activePacketGeneration=ref.generation;return ref.id}
  const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  function tokenBy(address){return tokens.find(t=>t.address.toLowerCase()===address.toLowerCase()) || {address,name:"Token",symbol:"TOKEN",decimals:18}}
  function selected(id){return tokenBy($(id).value)}
  function hashText(v){return E.id(v || "")}
  function bytes32Random(){return E.hexlify(crypto.getRandomValues(new Uint8Array(32)))}
  function setMessage(id,text,type=""){const n=$(id); if(!n)return;n.textContent=text;n.className=`message ${type}`}
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function toast(text){const n=$("toast");n.textContent=text;n.classList.add("show");setTimeout(()=>n.classList.remove("show"),2600)}
  function validAddress(a,label="地址"){const raw=String(a||"").trim();if(!/^0x[0-9a-fA-F]{40}$/.test(raw))throw new Error(`${label}格式不正确`);return E.getAddress(raw.toLowerCase())}
  function bindPasswordToggle(inputId,buttonId){const input=$(inputId),button=$(buttonId);button.onclick=()=>{const reveal=input.type==="password";input.type=reveal?"text":"password";button.textContent=reveal?"隐藏":"显示"}}
  bindPasswordToggle("packet-password","packet-password-toggle");bindPasswordToggle("claim-password","claim-password-toggle");
  function b64urlBytes(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
  function randomUrlToken(size=32){return b64urlBytes(crypto.getRandomValues(new Uint8Array(size)))}
  async function sha256url(value){return b64urlBytes(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))))}
  function oidcConfigured(){return Boolean(settings.claimRelayer&&settings.oidcIssuer&&settings.oidcClientId&&settings.oidcAudience)}
  function walletClaimsConfigured(){return Boolean(settings.claimRelayer&&relayerCapabilities.walletSignatureClaims)}
  async function loadRelayerCapabilities(){
    relayerCapabilities={};
    if(!settings.claimRelayer)return relayerCapabilities;
    try{
      const response=await fetch(`${settings.claimRelayer.replace(/\/$/,"")}/v1/capabilities`,{cache:"no-store"});
      if(response.ok)relayerCapabilities=await response.json();
    }catch{}
    return relayerCapabilities
  }
  async function oidcDiscovery(){
    if(!settings.oidcIssuer)throw new Error("登录服务尚未配置");
    const base=settings.oidcIssuer.replace(/\/$/,"");
    const response=await fetch(`${base}/.well-known/openid-configuration`,{cache:"no-store"});
    if(!response.ok)throw new Error("无法读取登录服务配置");
    const data=await response.json();
    if(!data.authorization_endpoint||!data.token_endpoint)throw new Error("登录服务配置不完整");
    return data
  }
  function oidcToken(){
    try{const value=JSON.parse(sessionStorage.getItem(OIDC_TOKEN_KEY)||"null");if(!value?.token||Date.now()>=Number(value.expiresAt||0)){sessionStorage.removeItem(OIDC_TOKEN_KEY);return ""}return value.token}catch{return ""}
  }
  function renderOidcState(){
    const loggedIn=Boolean(oidcToken()),ready=oidcConfigured(),state=$("claim-login-state");
    if(state)state.textContent=loggedIn?"已安全登录":ready?"尚未登录":"登录领取服务尚未配置";
    $("claim-login")?.classList.toggle("hidden",loggedIn);
    $("claim-logout")?.classList.toggle("hidden",!loggedIn);
    if($("claim-packet-gasless"))$("claim-packet-gasless").textContent=loggedIn?"免Gas领取":"登录并免Gas领取"
  }
  async function beginOidcLogin(){
    if(!oidcConfigured())throw new Error("请先配置红包领取服务、Issuer、Client ID 与 Audience");
    const discovery=await oidcDiscovery(),verifier=randomUrlToken(48),state=randomUrlToken(),nonce=randomUrlToken();
    sessionStorage.setItem(OIDC_FLOW_KEY,JSON.stringify({verifier,state,nonce,returnHash:location.hash||"#packet",createdAt:Date.now()}));
    const redirectUri=`${location.origin}${location.pathname}`;
    const url=new URL(discovery.authorization_endpoint);
    url.search=new URLSearchParams({response_type:"code",client_id:settings.oidcClientId,redirect_uri:redirectUri,scope:settings.oidcScope||"openid profile email",state,nonce,code_challenge:await sha256url(verifier),code_challenge_method:"S256",audience:settings.oidcAudience}).toString();
    location.assign(url.toString())
  }
  async function handleOidcCallback(){
    const params=new URLSearchParams(location.search);if(!params.has("code")&&!params.has("error"))return;
    const saved=readJSONFromSession(OIDC_FLOW_KEY);sessionStorage.removeItem(OIDC_FLOW_KEY);
    if(params.has("error"))throw new Error("登录未完成，请重试");
    if(!saved||saved.state!==params.get("state")||Date.now()-Number(saved.createdAt)>10*60*1000)throw new Error("登录状态已失效，请重新登录");
    const discovery=await oidcDiscovery(),redirectUri=`${location.origin}${location.pathname}`;
    const body=new URLSearchParams({grant_type:"authorization_code",code:params.get("code"),client_id:settings.oidcClientId,redirect_uri:redirectUri,code_verifier:saved.verifier});
    const response=await fetch(discovery.token_endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error("登录凭证交换失败");
    const field=settings.oidcTokenField==="id_token"?"id_token":"access_token",token=result[field];if(!token)throw new Error("登录服务没有返回可用凭证");
    sessionStorage.setItem(OIDC_TOKEN_KEY,JSON.stringify({token,expiresAt:Date.now()+Math.max(60,Number(result.expires_in||300))*1000}));
    history.replaceState(null,"",`${location.pathname}${saved.returnHash||"#packet"}`)
  }
  function readJSONFromSession(key){try{return JSON.parse(sessionStorage.getItem(key)||"null")}catch{return null}}
  function parseAmount(value,token){if(!value || Number(value)<=0)throw new Error("请输入大于0的金额");return E.parseUnits(String(value),token.decimals)}
  function formatAmount(value,token){return E.formatUnits(value,token.decimals)}
  function quoteFee(amount,bps){amount=BigInt(amount);return amount===0n?0n:(amount*BigInt(bps)+9999n)/10000n}
  function configured(name){const a=settings[name];if(!a || !E.isAddress(a))throw new Error(`请先在“合约与设置”填写${name}地址`);return E.getAddress(a)}
  function txLink(hash){return `${CFG.explorer}/tx/${hash}`}
  function errText(e){
    const raw=e?.shortMessage || e?.reason || e?.info?.error?.message || e?.message || "操作失败";
    if(/InvalidAddress/i.test(raw))return "钱包角色冲突：买方、卖方和仲裁者必须使用不同的钱包";
    if(/InvalidDeadline/i.test(raw))return "时间设置不符合要求，请把交付期限设为至少 2 分钟后";
    if(/InvalidReference/i.test(raw))return "加密信箱或订单资料不完整，请确认买卖双方都已开通信箱";
    if(/unknown custom error/i.test(raw))return "订单条件未通过合约检查，请确认买方、卖方和仲裁者不是同一个钱包";
    return raw;
  }
  function metadataHex(text=""){return E.toUtf8Bytes(text)}
  function formDeadline(seconds){return Math.floor(Date.now()/1000)+Number(seconds)}
  function getSecrets(){return readJSON(SECRET_KEY,{})}
  function packetSecretKey(id,generation=activePacketGeneration){return generation==="v4"?`v4:${id}`:String(id)}
  function setSecret(id,data,generation=activePacketGeneration){const all=getSecrets();all[packetSecretKey(id,generation)]=data;saveJSON(SECRET_KEY,all)}
  function getPacketSecret(id,generation=activePacketGeneration){return getSecrets()[packetSecretKey(id,generation)]}

  function renderTokens(){
    $$('[data-token-select]').forEach(select=>{const old=select.value;select.innerHTML=tokens.map(t=>`<option value="${t.address}">${t.symbol}${t.address===ZERO?" · 原生币":""}</option>`).join("");if(tokens.some(t=>t.address===old))select.value=old;});
  }
  function renderSettings(){
    for(const k of ["hub","escrow","packetV2","policy","circuitPolicy","intent","lock","priceOracle","processor","circuit","claimRelayer","oidcIssuer","oidcClientId","oidcAudience"]){const n=$(`setting-${k}`);if(n)n.value=settings[k]||""}
    for(const [k,value] of Object.entries({privacy:P3.entrypoint,privacyPool:P3.pool,privacyRelayer:P3.relayer,privacyAsp:P3.asp})){const n=$(`setting-${k}`);if(n){n.value=value;n.disabled=true}}
    const circuitReady=E.isAddress(settings.processor||"")&&Boolean(settings.circuit)&&E.isAddress(settings.circuitPolicy||"");
    $("circuit-status").textContent=circuitReady?"X Layer 已流片":"等待流片";
    $("circuit-status").classList.toggle("pending",!circuitReady);
    $("gasless-claim-box")?.classList.toggle("hidden",!(E.isAddress(settings.packetV2||"")&&oidcConfigured()));
    renderOidcState();
    const state=(id,ok)=>{const n=$(id);if(n){n.textContent=ok?"已配置":"未配置";n.style.color=ok?"#15803d":"#9a6a00"}};
    state("privacy-verifier-status",false);
    state("privacy-pool-status",false);
    state("privacy-prover-status",Boolean(window.TapeFlowPrivacy));
    state("privacy-asp-status",Boolean(P3.asp));
    state("privacy-relayer-status",Boolean(P3.relayer));
    const oracleReady=E.isAddress(settings.priceOracle||"");
    $("lock-oracle-state")?.classList.toggle("ready",oracleReady);
    if($("lock-oracle-state"))$("lock-oracle-state").textContent=oracleReady?"已核验":"未配置";
    if($("lock-oracle-label"))$("lock-oracle-label").textContent=oracleReady?`TapeFlow USD价格源 · ${short(settings.priceOracle)}`:"等待配置已核验价格源";
    loadPricePublisherStatus().catch(()=>{});
  }
  async function loadPricePublisherStatus(){
    const button=$("oracle-authorize-signer"),badge=$("oracle-publisher-badge");
    if(!button||!badge)return;
    const publisher=settings.oraclePublisherSigner;
    if(!E.isAddress(settings.priceOracle||"")||!E.isAddress(publisher||"")){
      badge.textContent="未配置";badge.classList.remove("ready");button.disabled=true;
      setMessage("oracle-publisher-status","价格注册表或服务器签名者尚未配置。","error");return;
    }
    $("oracle-publisher-signer").textContent=`${short(publisher)} · 独立服务器密钥`;
    try{
      const oracle=priceOracle(false),[admin,authorized,price]=await Promise.all([oracle.ADMIN(),oracle.isSigner(publisher),oracle.readPrice(ZERO)]);
      const isAdmin=Boolean(account)&&account.toLowerCase()===admin.toLowerCase(),updatedAt=Number(price.updatedAt||price[1]),age=updatedAt?Math.max(0,Math.floor(Date.now()/1000)-updatedAt):null,fresh=age!==null&&age<=3600;
      $("oracle-publisher-auth").textContent=authorized?"已授权":"等待管理员授权";
      $("oracle-publisher-price").textContent=updatedAt?`$${Number(E.formatUnits(price.priceE18||price[0],18)).toLocaleString(undefined,{maximumFractionDigits:6})} · ${age<60?"刚刚":`${Math.floor(age/60)}分钟前`}`:"等待首次发布";
      $("oracle-publisher-role").textContent=isAdmin?"价格注册表管理员":(account?"普通钱包":"尚未连接");
      badge.textContent=authorized?(fresh?"运行中":"已授权待启动"):"待授权";badge.classList.toggle("ready",authorized&&fresh);
      button.disabled=authorized||!isAdmin;button.textContent=authorized?"价格签名者已授权":(isAdmin?"授权价格签名者":(account?"仅管理员钱包可授权":"连接管理员钱包授权"));
      if(authorized&&fresh)setMessage("oracle-publisher-status",`价格源运行正常，最近一次链上报价在 ${new Date(updatedAt*1000).toLocaleString()}。`,"success");
      else if(authorized)setMessage("oracle-publisher-status","链上授权已完成，价格发布器正在等待启动。","success");
      else setMessage("oracle-publisher-status",`请使用管理员钱包 ${short(admin)} 完成一次链上授权。`);
    }catch(e){
      badge.textContent="读取失败";badge.classList.remove("ready");button.disabled=true;
      setMessage("oracle-publisher-status",errText(e),"error");
    }
  }
  async function authorizePricePublisher(){
    try{
      await ensureWallet();
      const publisher=validAddress(settings.oraclePublisherSigner,"服务器价格签名者"),admin=await priceOracle(false).ADMIN();
      if(account.toLowerCase()!==admin.toLowerCase())throw new Error(`请切换到价格注册表管理员钱包 ${short(admin)}`);
      if(await priceOracle(false).isSigner(publisher)){await loadPricePublisherStatus();return}
      askConfirm("授权价格签名者",[["价格注册表",settings.priceOracle],["服务器签名者",publisher],["权限范围","只能提交签名价格，不能转移用户资产"]],async()=>{await transact("oracle-publisher-status","授权价格签名者",()=>priceOracle().setSigner(publisher,true));await loadPricePublisherStatus()});
    }catch(e){setMessage("oracle-publisher-status",errText(e),"error")}
  }
  function navigate(page){
    $$('[data-page]').forEach(n=>n.classList.toggle("active",n.dataset.page===page));
    $$('[data-page-link]').forEach(n=>n.classList.toggle("active",n.dataset.pageLink===page));
    $("page-title").textContent=titleMap[page]||"TapeFlow X"; history.replaceState(null,"",`#${page}`); window.scrollTo({top:0,behavior:"smooth"});
  }
  function setLanguage(lang){
    document.documentElement.lang=lang;document.body.dataset.lang=lang;
    document.querySelectorAll("body *").forEach(el=>{if(el.children.length)return;const raw=(el.dataset.zh||el.textContent).trim();if(!el.dataset.zh&&EN[raw])el.dataset.zh=raw;if(el.dataset.zh)el.textContent=lang==="en"?(EN[el.dataset.zh]||el.dataset.zh):el.dataset.zh});
    const placeholders={"0x...":"0x...","输入红包码":"Enter packet code","输入口令":"Enter password","选填":"Optional","建议10位以上":"10+ characters recommended","选填，例如 团队激励 / 生日礼物":"Optional, e.g. team incentive / birthday gift","锁仓编号":"Lock ID","例如：收到的内容与约定不符，申请退款。":"Example: the delivery does not match the agreement; I request a refund.","例如：文件名、订单号或证据链接":"Example: filename, order number, or evidence link"};
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{if(!el.dataset.zhPlaceholder)el.dataset.zhPlaceholder=el.placeholder;el.placeholder=lang==="en"?(placeholders[el.dataset.zhPlaceholder]||el.dataset.zhPlaceholder):el.dataset.zhPlaceholder});
    $("language-button").textContent=lang==="en"?"中":"EN";localStorage.setItem("tapeflow-x-lang",lang);
  }

  function sessionAccounts(session){
    const rows=session?.namespaces?.eip155?.accounts||[];
    return rows.map(value=>String(value).split(":").pop()).filter(value=>E.isAddress(value)).map(value=>E.getAddress(value));
  }
  function createOkxEip1193(ui){
    const listeners=new Map();
    const emit=(event,payload)=>(listeners.get(event)||new Set()).forEach(fn=>{try{fn(payload)}catch{}});
    const provider={
      isTapeFlowOkxConnect:true,
      on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);return provider},
      removeListener(event,fn){listeners.get(event)?.delete(fn);return provider},
      async request({method,params=[]}){
        if(method==="eth_accounts"||method==="eth_requestAccounts")return sessionAccounts(ui.session);
        if(method==="eth_chainId")return CFG.chainHex;
        if(method==="net_version")return String(CFG.chainId);
        if(method==="wallet_switchEthereumChain"){
          const requested=Number.parseInt(String(params?.[0]?.chainId||CFG.chainHex),16);
          if(requested!==CFG.chainId)throw Object.assign(new Error("TapeFlow 当前仅支持 X Layer 主网"),{code:4902});
          ui.setDefaultChain?.(`eip155:${CFG.chainId}`);return null;
        }
        if(method==="wallet_addEthereumChain")return null;
        return ui.request({method,params},`eip155:${CFG.chainId}`);
      },
      emit
    };
    return provider;
  }
  async function getOkxUi(){
    if(okxUiPromise)return okxUiPromise;
    okxUiPromise=(async()=>{
      const sdk=window.OKXTonConnectUISdk;
      if(!sdk?.OKXUniversalConnectUI)throw new Error("OKX Connect 组件加载失败，请刷新页面重试");
      const ui=await sdk.OKXUniversalConnectUI.init({
        dappMetaData:{name:"TapeFlow",icon:new URL("./assets/tapeflow-connect.png",location.href).href},
        actionsConfiguration:{modals:"all",returnStrategy:"none"},
        uiPreferences:{theme:sdk.THEME?.LIGHT||"LIGHT"},
        language:document.documentElement.lang==="en"?"en_US":"zh_CN",
        restoreConnection:true
      });
      ui.on?.("session_update",session=>{if(remoteWalletProvider){const accounts=sessionAccounts(session);remoteWalletProvider.emit("accountsChanged",accounts);remoteWalletProvider.emit("chainChanged",CFG.chainHex);handleWalletAccountsChanged(accounts,remoteWalletProvider)}});
      ui.on?.("accountChanged",session=>{if(remoteWalletProvider){const accounts=sessionAccounts(session);remoteWalletProvider.emit("accountsChanged",accounts);handleWalletAccountsChanged(accounts,remoteWalletProvider)}});
      ui.on?.("session_delete",()=>{if(activeWalletProvider?.isTapeFlowOkxConnect)clearWalletState("钱包会话已断开")});
      ui.on?.("display_uri",()=>setMessage("wallet-connect-status","授权码已生成：请用另一台手机的 OKX Wallet 扫描，A 设备页面会保持不动。"));
      return ui;
    })().catch(error=>{okxUiPromise=undefined;throw error});
    return okxUiPromise;
  }
  async function installWalletProvider(provider,requestAccounts=false){
    activeWalletProvider=provider;
    browserProvider=new E.BrowserProvider(provider);
    await switchXLayer(provider);
    const method=requestAccounts?"eth_requestAccounts":"eth_accounts";
    const list=await provider.request({method,params:[]});
    if(!list?.length)throw new Error("钱包没有返回可用账户");
    account=E.getAddress(list[0]);signer=await browserProvider.getSigner();localStorage.removeItem(WALLET_DISCONNECTED_KEY);
    renderWalletState();await restoreInboxSession();await refreshBalance();return signer;
  }
  async function connectOkxWallet(mode="cross"){
    try{
      setMessage("wallet-connect-status",mode==="local"?"正在唤起本机 OKX App，仅用于授权；完成后请返回当前浏览器。":"正在生成跨设备授权码；请让 B 手机的 OKX Wallet 扫描并确认。","");
      const ui=await getOkxUi();
      $("wallet-dialog").close();
      const session=await ui.openModal({namespaces:{eip155:{chains:[`eip155:${CFG.chainId}`],defaultChain:String(CFG.chainId),rpcMap:{[String(CFG.chainId)]:CFG.rpcUrls[0]}}}});
      if(!session&&!ui.connected?.())return;
      remoteWalletProvider=createOkxEip1193(ui);
      await installWalletProvider(remoteWalletProvider,false);
      $("wallet-dialog").close();toast("OKX Wallet 已授权连接");
    }catch(error){if(!$("wallet-dialog").open)$("wallet-dialog").showModal();setMessage("wallet-connect-status",errText(error),"error")}
  }
  async function ensureWallet(){
    if(account&&signer)return signer;
    if(remoteWalletProvider){const list=await remoteWalletProvider.request({method:"eth_accounts"});if(list?.length)return installWalletProvider(remoteWalletProvider,false)}
    if(window.ethereum)return installWalletProvider(window.ethereum,true);
    showWalletConnect();throw new Error("请选择跨设备扫码或本机 OKX App 授权");
  }
  async function restoreConnectedWallet(){
    if(localStorage.getItem(WALLET_DISCONNECTED_KEY)==="1")return;
    if(window.ethereum){const list=await window.ethereum.request({method:"eth_accounts"});if(list?.length){await installWalletProvider(window.ethereum,false);return}}
    const ui=await getOkxUi();
    if(!ui.connected?.()||!sessionAccounts(ui.session).length)return;
    remoteWalletProvider=createOkxEip1193(ui);await installWalletProvider(remoteWalletProvider,false);
  }
  function renderWalletState(){
    $("wallet-label").textContent=short(account);$("summary-account").textContent=short(account);$("wallet-button").classList.toggle("connected",Boolean(account));$("wallet-button").setAttribute("aria-expanded","false");
    if(!account)$("okb-balance").textContent="—";
  }
  async function handleWalletAccountsChanged(accounts,provider){
    if(activeWalletProvider!==provider)return;
    clearInboxSession("需要重新解锁",true);signer=undefined;
    if(localStorage.getItem(WALLET_DISCONNECTED_KEY)==="1"||!accounts?.[0]){account="";browserProvider=undefined;renderWalletState();return}
    try{account=E.getAddress(accounts[0]);browserProvider=new E.BrowserProvider(provider);signer=await browserProvider.getSigner();renderWalletState();await refreshBalance()}catch{account="";signer=undefined;browserProvider=undefined;renderWalletState()}
    loadPricePublisherStatus().catch(()=>{});
  }
  function showWalletAccount(){
    if(!account)return;
    $("wallet-account-address").textContent=account;$("wallet-button").setAttribute("aria-expanded","true");$("wallet-account-dialog").showModal();
  }
  function clearWalletState(message="钱包已断开"){
    clearInboxSession("钱包已断开",true);localStorage.setItem(WALLET_DISCONNECTED_KEY,"1");account="";signer=undefined;browserProvider=undefined;activeWalletProvider=undefined;remoteWalletProvider=undefined;renderWalletState();$("wallet-account-dialog").close();toast(message);loadPricePublisherStatus().catch(()=>{});
  }
  async function disconnectWallet(){
    try{if(activeWalletProvider?.isTapeFlowOkxConnect){const ui=await getOkxUi();await ui.disconnect?.()}}catch{}finally{clearWalletState("已断开 TapeFlow 钱包连接")}
  }
  async function switchXLayer(provider=activeWalletProvider||window.ethereum){
    if(!provider)throw new Error("钱包连接不可用");
    try{await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:CFG.chainHex}]})}
    catch(e){if(e.code!==4902 && e.code!==-32603)throw e;await provider.request({method:"wallet_addEthereumChain",params:[{chainId:CFG.chainHex,chainName:CFG.chainName,nativeCurrency:CFG.nativeCurrency,rpcUrls:CFG.rpcUrls,blockExplorerUrls:[CFG.explorer]}]})}
  }
  async function refreshBalance(){if(!account||!browserProvider)return;const b=await browserProvider.getBalance(account);$("okb-balance").textContent=`${Number(E.formatEther(b)).toLocaleString(undefined,{maximumFractionDigits:5})} OKB`}
  function hub(write=true){return new E.Contract(configured("hub"),HUB_ABI,write?signer:browserProvider)}
  function escrowContract(write=true){return new E.Contract(configured("escrow"),ESCROW_ABI,write?signer:readProvider())}
  function usePacketV2(){return Boolean(settings.packetV2&&E.isAddress(settings.packetV2))}
  function packetHub(write=true,generation=activePacketGeneration){
    const address=E.getAddress(configured(generation==="v3"?"packetLegacyV3":"packetV2"));
    return new E.Contract(address,PACKET_V2_ABI,write?signer:readProvider());
  }
  function intent(write=true){return new E.Contract(configured("intent"),INTENT_ABI,write?signer:browserProvider)}
  function readProvider(){if(!publicProvider)publicProvider=new E.JsonRpcProvider(CFG.rpcUrls[0]);return publicProvider}
  function lockVault(write=true){return new E.Contract(configured("lock"),LOCK_ABI,write?signer:readProvider())}
  function priceOracle(write=true){return new E.Contract(configured("priceOracle"),PRICE_ORACLE_ABI,write?signer:readProvider())}
  function budgetPolicy(write=true){return new E.Contract(configured("circuitPolicy"),BUDGET_POLICY_ABI,write?signer:readProvider())}
  async function approveIfNeeded(token,spender,amount,statusId){
    if(token.address===ZERO)return;
    const c=new E.Contract(token.address,ERC20_ABI,signer);const [balance,allowance]=await Promise.all([c.balanceOf(account),c.allowance(account,spender)]);
    if(balance<amount)throw new Error(`${token.symbol}余额不足：需要 ${formatAmount(amount,token)}，当前 ${formatAmount(balance,token)}`);
    if(allowance>=amount)return;
    setMessage(statusId,`请先授权 ${token.symbol}…`);const tx=await c.approve(spender,amount);await tx.wait();
  }
  async function assertKnownWalletBalance(token,amount){
    if(!account)return;
    if(token.address===ZERO){const balance=await readProvider().getBalance(account);if(balance<=amount)throw new Error(`OKB余额不足：需要保留Gas后再支付 ${formatAmount(amount,token)}`);return}
    const balance=await new E.Contract(token.address,ERC20_ABI,readProvider()).balanceOf(account);
    if(balance<amount)throw new Error(`${token.symbol}余额不足：需要 ${formatAmount(amount,token)}，当前 ${formatAmount(balance,token)}`);
  }
  async function assertBudgetGuardAllows(token,recipient,amount,reference,policy){
    if(!policy||policy===ZERO||policy.toLowerCase()!==configured("circuitPolicy").toLowerCase())return;
    const guard=budgetPolicy(false),currentDay=BigInt(Math.floor(Date.now()/86400000));
    const [budget,allowlist,recipientOk]=await Promise.all([guard.budgets(account,token.address),guard.usesAllowlist(account,token.address),guard.recipientAllowed(account,token.address,recipient)]);
    const spent=budget.day===currentDay?budget.spentToday:0n;
    if(budget.frozen)throw new Error(`BudgetGuard：${token.symbol} 付款已暂停`);
    if(budget.singleLimit>0n&&amount>budget.singleLimit)throw new Error(`BudgetGuard：超过单笔限额 ${formatAmount(budget.singleLimit,token)} ${token.symbol}`);
    if(budget.dailyLimit>0n&&spent+amount>budget.dailyLimit)throw new Error(`BudgetGuard：超过每日限额，今日剩余 ${formatAmount(budget.dailyLimit-spent,token)} ${token.symbol}`);
    if(allowlist&&!recipientOk)throw new Error("BudgetGuard：该收款地址不在当前币种白名单中");
    const data=new E.Interface(BUDGET_POLICY_ABI).encodeFunctionData("validate",[account,token.address,recipient,amount,reference,"0x"]);
    try{await readProvider().call({to:policy,from:configured("hub"),data})}catch{throw new Error("BudgetGuard：TapeOut 电路拒绝了这笔付款")}
  }
  async function transact(statusId,label,fn){
    try{await ensureWallet();setMessage(statusId,`${label}：等待钱包确认…`);const tx=await fn();setMessage(statusId,`交易已提交 ${short(tx.hash)}，等待确认…`);const receipt=await tx.wait();setMessage(statusId,`${label}成功 · ${short(tx.hash)}`,"success");toast(`${label}成功`);await refreshBalance();return receipt}
    catch(e){setMessage(statusId,errText(e),"error");throw e}
  }
  function askConfirm(title,rows,action){
    $("confirm-title").textContent=title;$("confirm-details").innerHTML=rows.map(([a,b])=>`<div><b>${escapeHtml(a)}</b><br><span>${escapeHtml(b)}</span></div>`).join("");$("confirm-checkbox").checked=false;$("confirm-action").disabled=true;$("confirm-status").textContent="";confirmAction=action;$("confirm-dialog").showModal();
  }

  async function sendPayment({token,recipient,amount,memo,useHub=true,statusId="pay-status"}){
    recipient=validAddress(recipient,"收款地址");const units=parseAmount(amount,token);const reference=hashText(memo||`TapeFlow-${Date.now()}`);
    return transact(statusId,"付款",async()=>{
      if(!useHub){if(token.address===ZERO)return signer.sendTransaction({to:recipient,value:units});const c=new E.Contract(token.address,["function transfer(address,uint256) returns(bool)"],signer);return c.transfer(recipient,units)}
      const h=hub();const policy=settings.circuitPolicy&&E.isAddress(settings.circuitPolicy)?settings.circuitPolicy:(settings.policy&&E.isAddress(settings.policy)?settings.policy:ZERO);
      await assertBudgetGuardAllows(token,recipient,units,reference,policy);
      if(token.address===ZERO)return h.payNative(recipient,reference,policy,"0x",{value:units});
      await approveIfNeeded(token,await h.getAddress(),units,statusId);return h.payToken(token.address,recipient,units,reference,policy,"0x");
    });
  }

  $("pay-form").addEventListener("submit",async e=>{e.preventDefault();try{const token=selected("pay-token"),recipient=$("pay-recipient").value,amount=$("pay-amount").value,memo=$("pay-memo").value,useHub=$("pay-use-hub").checked;validAddress(recipient);const units=parseAmount(amount,token);await assertKnownWalletBalance(token,units);askConfirm("确认付款",[["网络",CFG.chainName],["币种与金额",`${amount} ${token.symbol}`],["完整收款地址",recipient],["订单备注",memo||"无"]],()=>sendPayment({token,recipient,amount,memo,useHub}))}catch(e2){setMessage("pay-status",errText(e2),"error")}});
  $("receive-form").addEventListener("submit",e=>{e.preventDefault();try{const req={v:1,chainId:CFG.chainId,token:$("receive-token").value,recipient:validAddress($("receive-recipient").value),amount:$("receive-amount").value,memo:$("receive-memo").value};parseAmount(req.amount,selected("receive-token"));const link=makeLink("request",req);showQR("receive-output",link,"扫码付款",`${req.amount} ${selected("receive-token").symbol}`,true);setMessage("receive-status","收款码已生成，可复制链接或让对方扫码。","success")}catch(e2){setMessage("receive-status",errText(e2),"error")}});
  $("use-my-address").onclick=async()=>{try{await ensureWallet();$("receive-recipient").value=account}catch(e){setMessage("receive-status",errText(e),"error")}};

  function packetUI(kind){
    packetKind=kind;$$('[data-packet-kind]').forEach(n=>n.classList.toggle("active",n.dataset.packetKind===kind));
    const directed=kind==="directed",password=kind==="password",lucky=kind==="lucky";
    $("packet-recipient-row").classList.toggle("hidden",!directed);$("packet-password-row").classList.toggle("hidden",!password);$("packet-count-row").classList.toggle("hidden",directed);
    $("packet-amount-label").textContent=(lucky||directed)?"红包总额":"每份金额";$("packet-form-title").textContent={equal:"创建普通红包",lucky:"创建随机红包",directed:"创建指定红包",password:"创建口令红包"}[kind];
    $("packet-id-row").classList.toggle("hidden",password);$("claim-mode-hint").textContent=password?"输入口令即可领取":"打开链接时会自动加载";
    if(password){
      $("packet-id").value="";$("claim-password").value="";$("claim-password-row").classList.remove("hidden");
      $("packet-detail").className="packet-detail empty";$("packet-detail").innerHTML='<div class="mini-envelope">令</div><b>输入领取口令</b><small>无需红包编号或分享链接</small>';
      $("claim-packet").classList.remove("hidden");$("claim-packet").disabled=false;$("claim-packet").textContent=walletClaimsConfigured()?"免 Gas 领取":"立即领取";
      $("reveal-packet").classList.add("hidden");$("refund-packet").classList.add("hidden");$("gasless-claim-box")?.classList.add("hidden");
    }else{
      $("claim-password-row").classList.add("hidden");
    }
    updatePacketTotal();
  }
  function updatePacketTotal(){const t=selected("packet-token"),c=packetKind==="directed"||packetKind==="lucky"?1:Number($("packet-count").value||0);try{const each=E.parseUnits($("packet-amount").value||"0",t.decimals),total=each*BigInt(Math.max(0,c)),fee=quoteFee(total,CFG.fees.packetBps),pay=total+fee;$("packet-total").textContent=`${formatAmount(total,t)} ${t.symbol}`;$("packet-fee").textContent=`${formatAmount(fee,t)} ${t.symbol}`;$("packet-pay-total").textContent=`${formatAmount(pay,t)} ${t.symbol}`}catch{$("packet-total").textContent=`0 ${t.symbol}`;$("packet-fee").textContent=`0 ${t.symbol}`;$("packet-pay-total").textContent=`0 ${t.symbol}`}}
  $$('[data-packet-kind]').forEach(n=>n.onclick=()=>{setMessage("packet-status","");setMessage("claim-status","");packetUI(n.dataset.packetKind)});["packet-amount","packet-count","packet-token"].forEach(id=>$(id).addEventListener("input",updatePacketTotal));
  $("packet-form").addEventListener("submit",e=>{e.preventDefault();createPacket()});
  function normalizePacketPassword(value){return String(value??"").normalize("NFKC").trim()}
  async function lookupPasswordPacket(password,{allowNotFound=false}={}){
    if(!settings.claimRelayer)throw new Error("口令红包领取服务尚未配置");
    const normalized=normalizePacketPassword(password);if(!normalized)throw new Error("请输入领取口令");
    const response=await fetch(`${settings.claimRelayer.replace(/\/$/,"")}/v1/packet/lookup-password`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({passwordDigest:hashText(normalized)})});
    const result=await response.json().catch(()=>({}));
    if(response.status===404&&result.error==="password_packet_not_found"&&allowNotFound)return null;
    if(!response.ok||!result.success){const errors={password_packet_not_found:"没有找到可领取的口令红包",password_packet_ambiguous:"这个口令暂时无法使用，请联系支持",password_digest_required:"请输入领取口令",rate_limited:"操作过于频繁，请稍后再试"};throw new Error(errors[result.error]||"口令红包查询失败")}
    return result;
  }
  async function locatePasswordPacketFromInput(){
    const result=await lookupPasswordPacket($("claim-password").value);activePacketGeneration="v4";$("packet-id").value=packetCode(result.packetId,"v4");
    const packet=await loadPacket();if(!packet||Number(packet.kind)!==3)throw new Error("没有找到可领取的口令红包");
    return {id:String(result.packetId),packet};
  }
  async function createPacket(){
    try{
      activePacketGeneration="v4";
      const token=selected("packet-token"),amount=$("packet-amount").value,count=packetKind==="directed"?1:Number($("packet-count").value),deadline=formDeadline($("packet-duration").value),meta=hashText($("packet-message").value);if(count<1||count>500)throw new Error("红包份数应为1到500");
      const each=parseAmount(amount,token),total=(packetKind==="equal"||packetKind==="password")?each*BigInt(count):each,fee=quoteFee(total,CFG.fees.packetBps),payTotal=total+fee;let secret,salt,passwordDigest;
      let passwordValue="";if(packetKind==="password"){passwordValue=normalizePacketPassword($("packet-password").value);if(passwordValue.length<10)throw new Error("领取口令至少10位");const existing=await lookupPasswordPacket(passwordValue,{allowNotFound:true});if(existing)throw new Error("这个口令已有未领完的红包，请更换口令")}
      const confirmRows=[["类型",$("packet-form-title").textContent],["红包总额",`${formatAmount(total,token)} ${token.symbol}`],["服务费 0.1%",`${formatAmount(fee,token)} ${token.symbol}`],["钱包合计",`${formatAmount(payTotal,token)} ${token.symbol}`],["份数",String(count)],["未领取处理","仅未领取本金到期可退；服务费不退"]];
      if(packetKind==="lucky")confirmRows.push(["创建步骤","钱包确认一次；系统自动激活后生成分享链接"]);
      askConfirm("确认创建红包",confirmRows,async()=>{
        const receipt=await transact("packet-status","创建红包",async()=>{const h=packetHub();await approveIfNeeded(token,await h.getAddress(),payTotal,"packet-status");const opts=token.address===ZERO?{value:payTotal}:{};
          if(packetKind==="equal")return h.createEqualPacket(token.address,each,count,deadline,meta,opts);
          if(packetKind==="directed")return h.createDirectedPacket(token.address,validAddress($("packet-recipient").value),total,deadline,meta,opts);
          if(packetKind==="lucky"){secret=bytes32Random();return h.createLuckyPacket(token.address,total,count,deadline,E.keccak256(secret),meta,opts)}
          salt=bytes32Random();passwordDigest=hashText(passwordValue);const passwordHash=E.solidityPackedKeccak256(["bytes32","bytes32"],[passwordDigest,salt]);return h.createPasswordPacket(token.address,passwordHash,salt,each,count,deadline,meta,opts);
        });
        const iface=new E.Interface(usePacketV2()?PACKET_V2_ABI:HUB_ABI);let id;for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name==="PacketCreated")id=p.args.packetId.toString()}catch{}}
        if(id){
          setSecret(id,{kind:packetKind,secret,salt,passwordDigest},"v4");setMessage("claim-status","");$("packet-id").value=packetCode(id,"v4");
          let readyToShare=true;
          if(packetKind==="lucky"){
            readyToShare=false;
            try{
              await requestSponsoredLuckyActivation(id,secret,"packet-status");
              readyToShare=true;
            }catch{
              setMessage("packet-status","随机红包资金已锁定，但自动激活暂未完成。请点击右侧“完成激活红包”恢复，成功后再分享。","error");
            }
          }
          await loadPacket();
          if(readyToShare&&packetKind!=="password"){const link=makeLink("packet",{id,hub:"v4"});showPacketShare(id,link,"v4");}
          if(readyToShare&&packetKind==="password")setMessage("packet-status","口令红包创建成功，把领取口令告诉对方即可。","success");
        }
      });
    }catch(e){setMessage("packet-status",errText(e),"error")}
  }
  async function waitForLuckyActivationBlock(createdBlock,statusId){
    const target=Number(createdBlock)+2,provider=browserProvider||readProvider();
    for(let attempt=0;attempt<60;attempt++){
      if(await provider.getBlockNumber()>=target)return;
      setMessage(statusId,"红包资金已锁定，正在等待链上确认后自动激活…");
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    throw new Error("链上确认较慢，请稍后点击“完成激活红包”");
  }
  async function activateLuckyPacket(id,secret,createdBlock,statusId="claim-status"){
    if(!secret)throw new Error("当前浏览器没有这个红包的激活凭证，请使用创建红包时的浏览器");
    if(createdBlock!==undefined&&createdBlock!==null)await waitForLuckyActivationBlock(createdBlock,statusId);
    return transact(statusId,"激活随机红包",()=>packetHub().revealLucky(id,secret));
  }
  async function requestSponsoredLuckyActivation(id,secret,statusId="packet-status"){
    if(!settings.claimRelayer)throw new Error("随机红包自动激活服务尚未配置");
    setMessage(statusId,"红包资金已锁定，系统正在自动激活…");
    const endpoint=`${settings.claimRelayer.replace(/\/$/,"")}/v1/packet/activate`;
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({packetId:String(id),secret})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.success){const errors={packet_not_found:"红包不存在",packet_not_lucky:"红包类型不正确",invalid_activation_secret:"红包激活凭证不匹配",activation_block_pending:"链上确认中，请稍后重试",activation_window_closed:"自动激活时间已过，请联系支持",activation_transaction_reverted:"自动激活交易失败",rate_limited:"请求过于频繁，请稍后重试"};throw new Error(errors[result.error]||"自动激活暂时失败")}
    setMessage(statusId,`随机红包创建成功并已自动激活${result.hash?` · ${short(result.hash)}`:""}`,"success");
    return result;
  }
  async function requestSponsoredWalletClaim(id,packet,kind,statusId="claim-status"){
    if(!walletClaimsConfigured())throw new Error("免 Gas 钱包领取服务尚未启用");
    await ensureWallet();
    const recipient=E.getAddress(account),base=settings.claimRelayer.replace(/\/$/,"");
    if(kind===1&&String(packet.directedTo).toLowerCase()!==recipient.toLowerCase())throw new Error("这个指定红包不是发给当前钱包的");
    let passwordDigest=null;
    if(kind===3){const password=normalizePacketPassword($("claim-password").value);if(!password)throw new Error("请输入领取口令");passwordDigest=hashText(password);const commitment=E.solidityPackedKeccak256(["bytes32","bytes32"],[passwordDigest,packet.passwordSalt]);if(commitment.toLowerCase()!==String(packet.secretHash).toLowerCase())throw new Error("口令不正确，请重新输入")}
    setMessage(statusId,"正在准备免 Gas 领取授权…");
    const challengeResponse=await fetch(`${base}/v1/packet/wallet-challenge`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({packetId:String(id),recipient})});
    const challenge=await challengeResponse.json().catch(()=>({}));
    if(!challengeResponse.ok||!challenge.success){const errors={wallet_claims_disabled:"免 Gas 钱包领取尚未启用",invalid_packet_id:"红包编号不正确",invalid_recipient:"钱包地址不正确",wallet_claim_rate_limited:"操作过于频繁，请稍后再试",rate_limited:"操作过于频繁，请稍后再试"};throw new Error(errors[challenge.error]||"无法创建免 Gas 领取授权")}
    if(Number(challenge.chainId)!==CFG.chainId||String(challenge.packetHub).toLowerCase()!==String(settings.packetV2).toLowerCase()||String(challenge.recipient).toLowerCase()!==recipient.toLowerCase()||String(challenge.packetId)!==String(id))throw new Error("免 Gas 领取授权内容与当前红包不一致");
    const claimDomain={name:"TapeFlow Gasless Claim",version:"1",chainId:CFG.chainId,verifyingContract:E.getAddress(settings.packetV2)};
    const claimTypes={WalletClaim:[{name:"packetId",type:"uint256"},{name:"recipient",type:"address"},{name:"nonce",type:"bytes32"},{name:"validUntil",type:"uint64"}]};
    const claimMessage={packetId:String(id),recipient,nonce:challenge.nonce,validUntil:Number(challenge.validUntil)};
    setMessage(statusId,"请在钱包中签名授权；这不是交易，不消耗 Gas。");
    const signature=await signer.signTypedData(claimDomain,claimTypes,claimMessage);
    const payload={packetId:String(id),recipient,nonce:challenge.nonce,signature};
    if(kind===3)payload.passwordDigest=passwordDigest;
    setMessage(statusId,"签名已核验，TapeFlow 正在代付 Gas…");
    const claimResponse=await fetch(`${base}/v1/packet/claim-wallet`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const result=await claimResponse.json().catch(()=>({}));
    if(!claimResponse.ok||!result.success){const errors={wallet_claims_disabled:"免 Gas 钱包领取尚未启用",wallet_challenge_missing_or_expired:"授权已过期，请重新领取",wallet_challenge_mismatch:"领取授权内容不一致",invalid_wallet_signature:"钱包签名验证失败",packet_not_found:"红包不存在",packet_expired:"红包已经过期",packet_fully_claimed:"红包已经领完",directed_recipient_mismatch:"这个指定红包不属于当前钱包",lucky_packet_not_revealed:"随机红包仍在准备中",recipient_already_claimed:"当前钱包已经领取过",login_already_claimed:"当前钱包已经领取过",password_digest_required:"请输入红包口令",password_incorrect:"口令不正确，请重新输入",claim_transaction_reverted:"代付交易失败",wallet_claim_rate_limited:"操作过于频繁，请稍后再试",rate_limited:"操作过于频繁，请稍后再试"};throw new Error(errors[result.error]||"免 Gas 领取失败")}
    setMessage(statusId,`免 Gas 领取成功 · ${short(result.hash)}`,"success");toast("领取成功，Gas 由 TapeFlow 支付");
    return result
  }
  async function loadPacket(){
    try{
      if(!browserProvider)browserProvider=window.ethereum?new E.BrowserProvider(window.ethereum):new E.JsonRpcProvider(CFG.rpcUrls[0]);
      const id=currentPacketId(),generation=activePacketGeneration;
      const read=packetHub(false,generation),p=await read.packets(id);if(p.creator===ZERO)throw new Error("红包不存在");
      const token=tokenBy(p.token),kindNumber=Number(p.kind),kind=["普通","指定","随机","口令"][kindNumber],left=formatAmount(p.remaining,token);
      const pendingLucky=kindNumber===2&&p.randomSeed===E.ZeroHash,full=Number(p.claimCount)>=Number(p.maxClaims)||p.remaining===0n,expired=Number(p.deadline)<Math.floor(Date.now()/1000),wrongDirected=kindNumber===1&&!!account&&String(p.directedTo).toLowerCase()!==account.toLowerCase();
      let alreadyClaimed=false;if(account){try{alreadyClaimed=await read.claimedAddress(id,account)}catch{}}
      const readiness=pendingLucky?"<br>创建者正在完成激活，请稍后刷新":"";
      $("packet-detail").className="packet-detail";
      $("packet-detail").innerHTML=`<div class="mini-envelope">福</div><b>${kind}红包 ${packetCode(id,generation)}</b><small>剩余 ${left} ${token.symbol} · 已领 ${p.claimCount}/${p.maxClaims}<br>到期 ${new Date(Number(p.deadline)*1000).toLocaleString()}${readiness}${generation==="v4"&&usePacketV2()?"<br>支持登录后免连接领取":""}</small>`;
      const claimButton=$("claim-packet");claimButton.classList.remove("hidden");claimButton.disabled=pendingLucky||full||expired||alreadyClaimed||wrongDirected;
      claimButton.textContent=pendingLucky?"红包准备中":full?"已领完":expired?"已过期":alreadyClaimed?"已领取":wrongDirected?"仅指定钱包可领":generation==="v4"&&walletClaimsConfigured()?"免 Gas 领取":"立即领取";
      $("claim-password-row").classList.toggle("hidden",kindNumber!==3||full||expired||alreadyClaimed);
      const secret=getPacketSecret(id,generation)?.secret,canActivate=pendingLucky&&!!secret&&(!account||String(p.creator).toLowerCase()===account.toLowerCase());
      $("reveal-packet").classList.toggle("hidden",!canActivate);
      $("refund-packet").classList.toggle("hidden",!account||String(p.creator).toLowerCase()!==account.toLowerCase());
      $("gasless-claim-box")?.classList.toggle("hidden",generation!=="v4"||!(usePacketV2()&&oidcConfigured())||pendingLucky||full||expired);
      return p;
    }catch(e){setMessage("claim-status",errText(e),"error")}
  }
  async function refreshPacketAfterClaim(previousClaimCount){let latest;for(let attempt=0;attempt<5;attempt++){if(attempt)await wait(800);latest=await loadPacket();if(latest&&Number(latest.claimCount)>previousClaimCount)return latest}return latest}
  $("load-packet").onclick=()=>{setMessage("claim-status","");loadPacket()};
  $("claim-packet").onclick=async()=>{try{
    let id,p;if(packetKind==="password"&&!$("packet-id").value){const located=await locatePasswordPacketFromInput();id=located.id;p=located.packet}else{id=currentPacketId();p=await loadPacket()}
    if(!p)throw new Error("红包加载失败，请稍后重试");const kind=Number(p.kind);
    if(activePacketGeneration==="v4"&&walletClaimsConfigured()){await requestSponsoredWalletClaim(id,p,kind,"claim-status");await refreshPacketAfterClaim(Number(p.claimCount));return}
    await transact("claim-status","领取红包",async()=>{
      const h=packetHub(),read=packetHub(false);
      if(await read.claimedAddress(id,account))throw new Error("当前钱包已经领取过这个红包");
      if(Number(p.claimCount)>=Number(p.maxClaims)||p.remaining===0n)throw new Error("这个红包已经领完");
      if(Number(p.deadline)<Math.floor(Date.now()/1000))throw new Error("这个红包已经过期");
      if(kind===1&&String(p.directedTo).toLowerCase()!==account.toLowerCase())throw new Error("这个指定红包不是发给当前钱包的");
      if(kind===2&&p.randomSeed===E.ZeroHash)throw new Error("红包正在激活，请稍后再试");
      if(kind===0)return h.claimEqual(id);if(kind===1)return h.claimDirected(id);if(kind===2)return h.claimLucky(id);
      const digest=hashText(normalizePacketPassword($("claim-password").value));if(usePacketV2())return h.claimPassword(id,digest);
      const commitment=E.keccak256(E.AbiCoder.defaultAbiCoder().encode(["uint256","address","bytes32","bytes32"],[id,account,digest,p.passwordSalt]));setMessage("claim-status","第一步：提交口令承诺…");const c=await h.commitPassword(id,commitment);await c.wait();setMessage("claim-status","第二步：揭示口令并领取…");return h.revealPassword(id,digest)
    });await refreshPacketAfterClaim(Number(p.claimCount))
  }catch(e){if(account)await loadPacket();setMessage("claim-status",errText(e),"error")}};
  $("reveal-packet").onclick=async()=>{try{const id=currentPacketId(),generation=activePacketGeneration,s=getPacketSecret(id,generation)?.secret,p=await loadPacket();await activateLuckyPacket(id,s,p?.createdBlock,"claim-status");await loadPacket();const link=makeLink("packet",{id,hub:generation});showPacketShare(id,link,generation)}catch(e){setMessage("claim-status",errText(e),"error")}};
  $("refund-packet").onclick=async()=>{try{const id=currentPacketId();await transact("claim-status","退回红包余额",()=>packetHub().refundPacket(id));await loadPacket()}catch{}};
  $("claim-packet-gasless").onclick=async()=>{try{
    if(activePacketGeneration!=="v4")throw new Error("历史红包请连接钱包领取");if(!usePacketV2()||!settings.claimRelayer)throw new Error("请先配置V4红包合约与登录领取服务");
    const token=oidcToken();if(!token){await beginOidcLogin();return}
    const id=currentPacketId(),p=await loadPacket(),destination=$("claim-destination").value.trim();
    if(!destination)throw new Error("请输入到账钱包或容器名称");
    const payload={packetId:id,destination};if(Number(p.kind)===3)payload.passwordDigest=hashText(normalizePacketPassword($("claim-password").value));
    setMessage("claim-status","正在核验登录身份并提交免Gas领取…");
    const response=await fetch(`${settings.claimRelayer.replace(/\/$/,"")}/v1/packet/claim`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${token}`},body:JSON.stringify(payload)});
    const result=await response.json().catch(()=>({}));if(!response.ok||!result.success){const errors={login_required:"请先登录",invalid_login:"登录已失效，请重新登录",invalid_recipient:"到账地址格式不正确",tapeout_name_unresolved:"没有解析到这个 TapeOut 容器名称",tapeout_name_wrong_network:"该容器不在 X Layer",tapeout_container_not_opened:"该 TapeOut 容器尚未开通，暂不能安全到账",packet_not_found:"红包不存在",packet_expired:"红包已经过期",packet_fully_claimed:"红包已经领完",directed_recipient_mismatch:"这个指定红包不属于该地址",lucky_packet_not_revealed:"随机红包尚未揭示",recipient_already_claimed:"该地址已经领取过",login_already_claimed:"当前登录账号已经领取过",password_digest_required:"请输入红包口令",claim_rate_limited:"操作太频繁，请一分钟后重试",rate_limited:"请求太频繁，请稍后重试"};if(["invalid_login","login_required"].includes(result.error)){sessionStorage.removeItem(OIDC_TOKEN_KEY);renderOidcState()}throw new Error(errors[result.error]||"免Gas领取失败")}
    setMessage("claim-status",`领取成功 · ${short(result.hash)}`,"success");toast("红包已转入指定地址");await loadPacket();
  }catch(e){setMessage("claim-status",errText(e),"error")}};
  $("claim-login").onclick=()=>beginOidcLogin().catch(e=>setMessage("claim-status",errText(e),"error"));
  $("claim-logout").onclick=()=>{sessionStorage.removeItem(OIDC_TOKEN_KEY);renderOidcState();setMessage("claim-status","已退出登录。","success")};

  const escrowStatusNames=["不存在","等待交付","等待验收","已放款","已退款","争议处理中","已裁决"];
  const escrowKindNames=["订单沟通","证据说明","交付证明","争议陈述","裁决说明"];
  const ESCROW_CODE_SALT=0x54465831;
  const sameAddress=(a,b)=>a&&b&&String(a).toLowerCase()===String(b).toLowerCase();
  const endpointChain=(endpoint)=>Number((BigInt(endpoint)>>160n)&((1n<<64n)-1n));
  const isZeroBytes=(value)=>!value||value===E.ZeroHash;
  const twoDigits=(value)=>String(value).padStart(2,"0");
  function escrowCode(id,createdAt){
    const numericId=BigInt(id),timestamp=Number(createdAt);
    if(numericId<=0n||numericId>0xffffffffn||!Number.isSafeInteger(timestamp)||timestamp<=0)throw new Error("订单资料不完整");
    const d=new Date(timestamp*1000),date=`${d.getUTCFullYear()}${twoDigits(d.getUTCMonth()+1)}${twoDigits(d.getUTCDate())}`,time=`${twoDigits(d.getUTCHours())}${twoDigits(d.getUTCMinutes())}${twoDigits(d.getUTCSeconds())}`;
    const mixed=String((Number(numericId)^timestamp^ESCROW_CODE_SALT)>>>0).padStart(10,"0");
    return `TFX-${date}-${time}-${mixed}`;
  }
  function parseEscrowCode(value){
    const normalized=String(value||"").trim().toUpperCase();
    if(!normalized)throw new Error("请输入订单码");
    if(/^\d+$/.test(normalized))return{id:normalized,legacy:true};
    const match=normalized.match(/^TFX-(\d{8})-(\d{6})-(\d{10})$/);
    if(!match)throw new Error("订单码格式不正确，请输入完整的 TFX 订单码");
    const date=match[1],time=match[2],year=Number(date.slice(0,4)),month=Number(date.slice(4,6)),day=Number(date.slice(6,8)),hour=Number(time.slice(0,2)),minute=Number(time.slice(2,4)),second=Number(time.slice(4,6)),timestamp=Math.floor(Date.UTC(year,month-1,day,hour,minute,second)/1000),check=new Date(timestamp*1000);
    if(check.getUTCFullYear()!==year||check.getUTCMonth()+1!==month||check.getUTCDate()!==day||check.getUTCHours()!==hour||check.getUTCMinutes()!==minute||check.getUTCSeconds()!==second)throw new Error("订单码中的日期时间无效");
    const mixed=Number.parseInt(match[3],10);if(!Number.isSafeInteger(mixed)||mixed>0xffffffff)throw new Error("订单码无效");
    const id=((mixed>>>0)^(timestamp>>>0)^ESCROW_CODE_SALT)>>>0;if(!id)throw new Error("订单码无效");
    return{id:String(id),code:normalized};
  }

  function renderInboxState(text,ready=false){
    const n=$("escrow-inbox-state");n.textContent=text;n.className=`status-chip ${ready?"ready":"pending"}`;
    $("escrow-inbox-enable")?.classList.toggle("hidden",ready);$("escrow-inbox-lock")?.classList.toggle("hidden",!ready);
  }

  function readInboxSession(){try{return JSON.parse(sessionStorage.getItem(INBOX_SESSION_KEY)||"null")}catch{return null}}
  function scheduleInboxExpiry(expiresAt){
    if(inboxExpiryTimer)clearTimeout(inboxExpiryTimer);
    const remaining=Number(expiresAt)-Date.now();
    if(remaining<=0){clearInboxSession("会话已过期，请重新解锁");return}
    inboxExpiryTimer=setTimeout(()=>{clearInboxSession("会话已过期，请重新解锁");setMessage("escrow-inbox-status","30 分钟免签时间已结束，请重新签名解锁。")},remaining);
  }
  function saveInboxSession(signature,escrowAddress){
    const expiresAt=Date.now()+INBOX_SESSION_MS;
    try{sessionStorage.setItem(INBOX_SESSION_KEY,JSON.stringify({wallet:account,signature,chainId:Number(CFG.chainId),escrow:String(escrowAddress).toLowerCase(),expiresAt}))}catch{}
    scheduleInboxExpiry(expiresAt);
  }
  function clearInboxSession(stateText="需要重新解锁",clearHistory=false){
    try{sessionStorage.removeItem(INBOX_SESSION_KEY)}catch{}
    if(inboxExpiryTimer)clearTimeout(inboxExpiryTimer);inboxExpiryTimer=undefined;inboxIdentity=undefined;caseKeys.clear();renderInboxState(stateText,false);
    if(clearHistory){const n=$("escrow-message-log");if(n){n.className="escrow-log empty";n.innerHTML="<small>信箱已锁定，重新解锁后可读取加密记录</small>"}}
  }
  async function restoreInboxSession(){
    if(!account||!window.TapeFlowCaseCrypto)return;
    if(inboxIdentity&&sameAddress(inboxIdentity.wallet,account))return inboxIdentity;
    const saved=readInboxSession(),escrowAddress=configured("escrow");if(!saved)return;
    if(!saved.signature||!sameAddress(saved.wallet,account)||Number(saved.chainId)!==Number(CFG.chainId)||String(saved.escrow).toLowerCase()!==String(escrowAddress).toLowerCase()||Date.now()>=Number(saved.expiresAt||0)){clearInboxSession(Date.now()>=Number(saved?.expiresAt||0)?"会话已过期，请重新解锁":"需要重新解锁");return}
    const text=window.TapeFlowCaseCrypto.inboxKeyText({holder:account,chainId:CFG.chainId,escrow:escrowAddress});
    if(!sameAddress(E.verifyMessage(text,saved.signature),account)){clearInboxSession();return}
    const derived=await window.TapeFlowCaseCrypto.deriveInboxKeyPair({signature:saved.signature,holder:account,chainId:CFG.chainId,escrow:escrowAddress});
    const publicKey=window.TapeFlowCaseCrypto.bytesToHex(derived.publicKey);let registered;
    try{registered=await escrowContract(false).inboxPublicKey(account)}catch{return}
    if(isZeroBytes(registered)||String(registered).toLowerCase()!==publicKey.toLowerCase()){clearInboxSession();return}
    inboxIdentity={wallet:account,...derived};renderInboxState("已开通 · 会话已自动解锁",true);scheduleInboxExpiry(saved.expiresAt);
    setMessage("escrow-inbox-status","已在本标签页自动恢复。免签有效期内无需重复点击或签名；密钥不会上传服务器。","success");
    if(activeEscrow)await loadEscrowMessages();return inboxIdentity;
  }

  async function unlockInbox(register=true){
    if(!window.TapeFlowCaseCrypto)throw new Error("钱包信箱加密模块没有加载");
    await ensureWallet();const escrowAddress=configured("escrow");
    if(inboxIdentity&&sameAddress(inboxIdentity.wallet,account))return inboxIdentity;
    const text=window.TapeFlowCaseCrypto.inboxKeyText({holder:account,chainId:CFG.chainId,escrow:escrowAddress});
    setMessage("escrow-inbox-status","请在钱包中签名解锁。此签名只用于本地派生加密密钥，不会发送交易。");
    const signature=await signer.signMessage(text);
    if(!sameAddress(E.verifyMessage(text,signature),account))throw new Error("钱包签名校验失败");
    const derived=await window.TapeFlowCaseCrypto.deriveInboxKeyPair({signature,holder:account,chainId:CFG.chainId,escrow:escrowAddress});
    const publicKey=window.TapeFlowCaseCrypto.bytesToHex(derived.publicKey),c=escrowContract(false),registered=await c.inboxPublicKey(account);
    if(isZeroBytes(registered)){
      if(!register)throw new Error("当前钱包尚未开通加密信箱");
      await transact("escrow-inbox-status","开通钱包加密信箱",()=>escrowContract().registerInboxKey(publicKey));
    }else if(String(registered).toLowerCase()!==publicKey.toLowerCase()){
      throw new Error("链上信箱公钥与本次签名派生的密钥不一致，请确认使用同一钱包和官方页面");
    }
    inboxIdentity={wallet:account,...derived};saveInboxSession(signature,escrowAddress);renderInboxState("已开通 · 30分钟内免签",true);setMessage("escrow-inbox-status","信箱已解锁。本标签页 30 分钟内刷新可自动恢复；关闭标签页、切换钱包或立即锁定都会清除。","success");
    if(activeEscrow)await loadEscrowMessages();return inboxIdentity;
  }

  async function getCaseKey(){
    if(!activeEscrow)throw new Error("请先查询担保订单");
    if(caseKeys.has(activeEscrow.id))return caseKeys.get(activeEscrow.id);
    const identity=await unlockInbox(false),c=escrowContract(),envelope=await c.caseKeyEnvelope(activeEscrow.id,account);
    if(!envelope||envelope==="0x")throw new Error("当前钱包尚未获得该订单的解密权限");
    const key=await window.TapeFlowCaseCrypto.unwrapCaseKey({envelope:E.getBytes(envelope),secretKey:identity.secretKey,chainId:CFG.chainId,escrow:configured("escrow"),caseId:activeEscrow.e.caseId,recipient:account});
    caseKeys.set(activeEscrow.id,key);return key;
  }

  async function grantCurrentCaseKey(grantee,statusId="escrow-message-status"){
    const key=await getCaseKey(),c=escrowContract(false),publicKey=await c.inboxPublicKey(grantee);
    if(isZeroBytes(publicKey))throw new Error("仲裁者尚未开通 TapeFlow 钱包加密信箱；其开通后，买卖任一方可再次点击授权");
    const envelope=await window.TapeFlowCaseCrypto.wrapCaseKey({caseKey:key,recipientPublicKey:E.getBytes(publicKey),chainId:CFG.chainId,escrow:configured("escrow"),caseId:activeEscrow.e.caseId,recipient:grantee});
    const receipt=await transact(statusId,"授权仲裁者读取完整历史",()=>escrowContract().grantCaseKey(activeEscrow.id,grantee,window.TapeFlowCaseCrypto.bytesToHex(envelope)));
    if(activeEscrow){activeEscrow.missingCaseReaders=(activeEscrow.missingCaseReaders||[]).filter(reader=>!sameAddress(reader,grantee));$("escrow-grant-arbiter").classList.toggle("hidden",!activeEscrow.missingCaseReaders.length)}
    return receipt;
  }

  $("escrow-inbox-enable").onclick=()=>unlockInbox(true).catch(e=>setMessage("escrow-inbox-status",errText(e),"error"));
  $("escrow-inbox-lock").onclick=()=>{clearInboxSession("已锁定",true);setMessage("escrow-inbox-status","信箱已立即锁定，本标签页保存的会话签名和解密密钥均已清除。","success")};

  async function loadDefaultArbiter(){
    const n=$("escrow-default-arbiter");
    if(!settings.escrow||!E.isAddress(settings.escrow)){n.textContent="部署后留空将默认由 TapeFlow 仲裁";return}
    try{const c=escrowContract(false),a=await c.defaultArbiter(),endpoint=await c.defaultArbiterEndpoint();n.textContent=`默认 TapeFlow：${short(a)}${isZeroBytes(endpoint)?" · 尚未配置TapeSend端点":" · 已配置加密收件"}`}
    catch{n.textContent="暂时无法读取默认仲裁信息"}
  }

  $("escrow-arbiter").addEventListener("input",e=>$("escrow-arbiter-endpoint-row").classList.toggle("hidden",!e.target.value.trim()));
  function updateEscrowTotal(){const t=selected("escrow-token");try{const principal=E.parseUnits($("escrow-amount").value||"0",t.decimals),reward=E.parseUnits($("escrow-arbiter-reward").value||"0",t.decimals),fee=quoteFee(principal,CFG.fees.escrowBps),total=principal+fee+reward;$("escrow-principal").textContent=`${formatAmount(principal,t)} ${t.symbol}`;$("escrow-fee").textContent=`${formatAmount(fee,t)} ${t.symbol}`;$("escrow-reward-total").textContent=`${formatAmount(reward,t)} ${t.symbol}`;$("escrow-pay-total").textContent=`${formatAmount(total,t)} ${t.symbol}`}catch{for(const id of ["escrow-principal","escrow-fee","escrow-reward-total","escrow-pay-total"])$(id).textContent=`0 ${t.symbol}`}}
  ["escrow-amount","escrow-arbiter-reward","escrow-token"].forEach(id=>$(id).addEventListener("input",updateEscrowTotal));
  $("escrow-form").addEventListener("submit",async e=>{e.preventDefault();try{
    if(!window.TapeFlowTapeSend)throw new Error("TapeSend加密模块没有加载");
    await ensureWallet();
    const token=selected("escrow-token"),payee=validAddress($("escrow-payee").value),arbiter=$("escrow-arbiter").value?validAddress($("escrow-arbiter").value):ZERO,units=parseAmount($("escrow-amount").value,token),reward=E.parseUnits($("escrow-arbiter-reward").value||"0",token.decimals),fee=quoteFee(units,CFG.fees.escrowBps),totalFunding=units+fee+reward,deadline=Math.floor(new Date($("escrow-deadline").value).getTime()/1000),review=Number($("escrow-review-period").value);
    const cRead=escrowContract(false),defaultArbiter=await cRead.defaultArbiter(),selectedArbiter=arbiter===ZERO?defaultArbiter:arbiter;
    if(sameAddress(payee,account))throw new Error("买方和卖方不能使用同一个钱包");
    if(sameAddress(selectedArbiter,account))throw new Error("当前买方钱包也是所选仲裁钱包，请填写另一个仲裁钱包");
    if(sameAddress(selectedArbiter,payee))throw new Error("卖方不能同时担任本订单仲裁者，请填写另一个仲裁钱包");
    if(!Number.isFinite(deadline)||deadline<Math.floor(Date.now()/1000)+120)throw new Error("交付期限必须设为至少 2 分钟后");
    setMessage("escrow-status","正在建立买卖双方的钱包加密信箱…");
    const identity=await unlockInbox(true),payeeInbox=await cRead.inboxPublicKey(payee);
    if(isZeroBytes(payeeInbox))throw new Error("卖方尚未开通钱包加密信箱。请让卖方连接一次 TapeFlow，点击“开通 / 解锁信箱”后再创建订单");
    let payerEndpoint={endpoint:E.ZeroHash},payeeEndpoint={endpoint:E.ZeroHash};
    const payerEndpointText=$("escrow-payer-endpoint").value.trim(),payeeEndpointText=$("escrow-payee-endpoint").value.trim();
    if(Boolean(payerEndpointText)!==Boolean(payeeEndpointText))throw new Error("原生 TapeSend 副本需要同时填写买方发件电路和卖方收件端点，或两项都留空");
    if(payerEndpointText){
      payerEndpoint=await window.TapeFlowTapeSend.resolveOnChain(payerEndpointText,CFG.chainId);if(!sameAddress(payerEndpoint.holder,account))throw new Error("当前钱包不是发件电路持有人");
      payeeEndpoint=await window.TapeFlowTapeSend.resolveOnChain(payeeEndpointText,CFG.chainId);
    }
    let arbiterEndpoint=E.ZeroHash;
    if(arbiter!==ZERO&&$("escrow-arbiter-endpoint").value.trim())arbiterEndpoint=(await window.TapeFlowTapeSend.resolveOnChain($("escrow-arbiter-endpoint").value,CFG.chainId)).endpoint;
    const caseId=bytes32Random(),caseKey=window.TapeFlowCaseCrypto.randomCaseKey(),payerEnvelope=await window.TapeFlowCaseCrypto.wrapCaseKey({caseKey,recipientPublicKey:identity.publicKey,chainId:CFG.chainId,escrow:configured("escrow"),caseId,recipient:account}),payeeEnvelope=await window.TapeFlowCaseCrypto.wrapCaseKey({caseKey,recipientPublicKey:E.getBytes(payeeInbox),chainId:CFG.chainId,escrow:configured("escrow"),caseId,recipient:payee});
    askConfirm("确认创建担保",[["卖方",payee],["担保本金",`${formatAmount(units,token)} ${token.symbol}`],["服务费 1%",`${formatAmount(fee,token)} ${token.symbol}`],["自愿仲裁奖励",`${formatAmount(reward,token)} ${token.symbol}`],["钱包合计锁定",`${formatAmount(totalFunding,token)} ${token.symbol}`],["仲裁者",arbiter===ZERO?"TapeFlow 默认仲裁者":arbiter],["交付期限",new Date(deadline*1000).toLocaleString()],["验收时间",`${Math.round(review/86400)}天`]],async()=>{
      const receipt=await transact("escrow-status","创建担保",async()=>{const c=escrowContract();await approveIfNeeded(token,await c.getAddress(),totalFunding,"escrow-status");return c.createEscrow(token.address,payee,arbiter,units,reward,deadline,review,hashText($("escrow-memo").value),payerEndpoint.endpoint,payeeEndpoint.endpoint,arbiterEndpoint,caseId,window.TapeFlowCaseCrypto.bytesToHex(payerEnvelope),window.TapeFlowCaseCrypto.bytesToHex(payeeEnvelope),token.address===ZERO?{value:totalFunding}:{})});
      const id=findEscrowEventId(receipt);if(id){caseKeys.set(id,caseKey);$("escrow-id").value=id;$("escrow-message-sender").value=$("escrow-payer-endpoint").value;await loadEscrow();await loadMyEscrows()}
    })
  }catch(e2){setMessage("escrow-status",errText(e2),"error")}});

  function findEscrowEventId(receipt){const iface=new E.Interface(ESCROW_ABI);for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name==="EscrowCreated")return p.args.escrowId.toString()}catch{}}}
  function escrowRole(e,defaultArbiter,intervened){
    if(!account)return "访客";
    if(sameAddress(account,e.payer))return "买方";
    if(sameAddress(account,e.payee))return "卖方";
    if(sameAddress(account,e.arbiter))return "指定仲裁者";
    if(intervened&&sameAddress(account,defaultArbiter))return "TapeFlow仲裁者";
    return "访客";
  }
  function progressCard(step,label,detail,current,done){return `<div class="${done?"done":current?"current":""}"><i>${done?"✓":step}</i><b>${label}</b><small>${detail}</small></div>`}

  async function loadEscrow(){try{
    const parsed=parseEscrowCode($("escrow-id").value),id=parsed.id;
    const c=escrowContract(false),e=await c.escrows(id);if(e.payer===ZERO)throw new Error("担保订单不存在");
    const [defaultArbiter,defaultArbiterEndpoint,intervened]=await Promise.all([c.defaultArbiter(),c.defaultArbiterEndpoint(),c.tapeFlowIntervened(id)]),t=tokenBy(e.token),status=Number(e.status),role=escrowRole(e,defaultArbiter,intervened),now=Math.floor(Date.now()/1000),reviewAt=Number(e.deliveredAt)+Number(e.reviewPeriod),overdue=status===5&&now>=Number(e.disputedAt)+15*86400,deliveryExpired=status===1&&now>Number(e.deliveryDeadline),deliveryText=new Date(Number(e.deliveryDeadline)*1000).toLocaleString();
    const code=escrowCode(id,e.createdAt);if(parsed.code&&parsed.code!==code)throw new Error("订单码校验失败，请检查是否完整复制");
    activeEscrow={id:String(id),code,e,t,status,role,defaultArbiter,defaultArbiterEndpoint,intervened,overdue};
    $("escrow-id").value=code;$("escrow-workspace").classList.remove("hidden");$("escrow-title").textContent=`担保订单 ${code}`;$("escrow-role").textContent=role;
    $("escrow-detail").className="";
    $("escrow-detail").innerHTML=`<div class="escrow-order-summary"><div><small>状态</small><b>${escrowStatusNames[status]}</b></div><div><small>担保金额</small><b>${formatAmount(e.amount,t)} ${t.symbol}</b></div><div><small>服务费</small><b>${formatAmount(e.serviceFee,t)} ${t.symbol}</b></div><div><small>仲裁奖励</small><b>${formatAmount(e.arbiterReward,t)} ${t.symbol}</b></div></div><div class="card-copy">买方 ${short(e.payer)} · 卖方 ${short(e.payee)}<br>仲裁者 ${short(e.arbiter)}${intervened?" · TapeFlow已并行接入":""}<br>交付期限 ${deliveryText}${Number(e.deliveredAt)?` · 验收截止 ${new Date(reviewAt*1000).toLocaleString()}`:""}</div>${role==="卖方"&&status===1?`<div class="escrow-deadline-alert ${deliveryExpired?"overdue":""}"><span>${deliveryExpired?"交付已经逾期":"卖家交付期限"}</span><b>${deliveryExpired?`已超过 ${deliveryText}`:`请在 ${deliveryText} 前完成交付`}</b><small>${deliveryExpired?"买方现在可以退回未交付资金。":"请先发送交付说明，再点击“确认已经交付”；逾期后买方可以退回资金。"}</small></div>`:""}`;
    const delivered=status>=2&&status!==4,disputed=status===5,resolved=status===6,closed=[3,4,6].includes(status);
    $("escrow-progress").innerHTML=progressCard(1,"资金托管","合约已锁定资产",false,status>=1)+progressCard(2,"交付验收",Number(e.deliveredAt)?"卖方已标记交付":"等待卖方履约",status===1,delivered)+progressCard(3,disputed?"争议仲裁":"确认结算",disputed?"等待仲裁裁决":"买方放款或自动结算",status===2||disputed,!disputed&&closed)+progressCard(4,"订单完成",resolved?"仲裁裁决完成":status===3?"已向卖方放款":status===4?"已退款":"尚未完成",false,closed);
    const party=role==="买方"||role==="卖方",canArbitrate=disputed&&(role==="指定仲裁者"||role==="TapeFlow仲裁者"),canIntervene=disputed&&overdue&&!intervened&&sameAddress(account,defaultArbiter)&&!sameAddress(e.arbiter,defaultArbiter);
    const reviewElapsed=status===2&&now>=reviewAt;
    const visibility={"escrow-delivered":role==="卖方"&&status===1,"escrow-release":role==="买方"&&status===2,"escrow-finalize":party&&reviewElapsed,"escrow-dispute":party&&(status===1||status===2),"escrow-refund":role==="买方"&&deliveryExpired};
    Object.entries(visibility).forEach(([key,show])=>$(key).classList.toggle("hidden",!show));
    $("escrow-refund").classList.toggle("escrow-main-action",visibility["escrow-refund"]);
    $("escrow-refund").classList.toggle("escrow-secondary-action",!visibility["escrow-refund"]);
    const nextAction=status===1&&role==="卖方"&&deliveryExpired?["交付已经逾期","请勿继续交付；买方现在可以退回未交付资金。"]:status===1&&role==="卖方"?["轮到你操作","请在交付期限前发送交付说明，并点击“确认已经交付”。"]:status===1&&role==="买方"&&deliveryExpired?["交付已经逾期","卖方未按时交付，你现在可以点击“交付逾期，退回资金”。"]:status===1&&role==="买方"?["等待卖方交付","卖方完成交付后，你会在这里看到验收和放款操作。"]:status===2&&role==="买方"?["请验收交付","确认无误后点击“验收完成，确认放款”；如有问题可发起争议。"]:status===2&&role==="卖方"?["等待买方验收","你已标记交付，买方确认后资金将支付给你。"]:status===5?["争议处理中","双方证据已进入仲裁流程，请等待仲裁者裁决。"]:closed?["订单已完成","这笔担保已完成结算，无需继续操作。"]:["查看订单状态","当前钱包没有需要立即处理的操作。"];
    $("escrow-next-action").innerHTML=`<span>${nextAction[0]}</span><b>${nextAction[1]}</b>`;
    $("escrow-message-form").classList.toggle("hidden",closed||!(party||canArbitrate));
    $("escrow-log-card").classList.toggle("hidden",!(party||canArbitrate));
    $("escrow-message-audience").textContent=disputed?"争议已开启：仲裁者获得订单密钥后可读取完整历史；未授权前仍无法解密。":"争议前仅买方与卖方可解密；仲裁者尚未获得订单密钥。";
    const missingReaders=[];
    if(disputed&&party&&!(await c.hasCaseKeyEnvelope(id,e.arbiter)))missingReaders.push(e.arbiter);
    if(disputed&&party&&intervened&&!sameAddress(e.arbiter,defaultArbiter)&&!(await c.hasCaseKeyEnvelope(id,defaultArbiter)))missingReaders.push(defaultArbiter);
    activeEscrow.missingCaseReaders=missingReaders;$("escrow-grant-arbiter").classList.toggle("hidden",!missingReaders.length);$("escrow-grant-arbiter").textContent=missingReaders.length>1?"授权两位仲裁者读取完整历史":"授权仲裁者读取完整历史";
    $("escrow-fallback-panel").classList.toggle("hidden",!(disputed&&party&&!sameAddress(e.arbiter,defaultArbiter)));
    if(disputed&&party&&!sameAddress(e.arbiter,defaultArbiter)){
      const [pa,sa]=await Promise.all([c.fallbackApproval(id,e.payer),c.fallbackApproval(id,e.payee)]),approved=(role==="买方"&&pa)||(role==="卖方"&&sa),approveButton=$("escrow-fallback-approve");
      $("escrow-fallback-state").innerHTML=`<span class="${pa?"ok":"waiting"}"><i>${pa?"✓":"1"}</i><b>买方确认</b><small>${pa?"已完成":"尚未确认"}</small></span><span class="${sa?"ok":"waiting"}"><i>${sa?"✓":"2"}</i><b>卖方确认</b><small>${sa?"已完成":"尚未确认"}</small></span>`;
      approveButton.disabled=approved;approveButton.textContent=approved?"当前钱包已确认，等待另一方":`以${role}身份确认切换`;
    }
    const arbitration=$("escrow-arbitration-form");arbitration.classList.toggle("hidden",!(canArbitrate||canIntervene));
    $("escrow-intervene").classList.toggle("hidden",!canIntervene);
    arbitration.querySelectorAll(".form-split,label,#escrow-resolve-button").forEach(n=>n.classList.toggle("hidden",!canArbitrate));
    if(canArbitrate){$("escrow-payer-award").value=formatAmount(e.amount,t);$("escrow-payee-award").value="0"}
    await loadEscrowMessages();return activeEscrow;
  }catch(e){setMessage("escrow-manage-status",errText(e),"error");throw e}}

  async function refreshEscrowAfterStatus(...expectedStatuses){
    const id=activeEscrow?.id;
    if(!id)return loadEscrow();
    const c=escrowContract(false);
    for(let attempt=0;attempt<10;attempt++){
      const latest=await c.escrows(id);
      if(expectedStatuses.includes(Number(latest.status)))break;
      await wait(1000);
    }
    const result=await loadEscrow();
    if(expectedStatuses.some(status=>[3,4,6].includes(status))){
      ["escrow-delivered","escrow-release","escrow-finalize","escrow-dispute","escrow-refund","escrow-grant-arbiter","escrow-fallback-panel","escrow-arbitration-form","escrow-message-form"].forEach(key=>$(key)?.classList.add("hidden"));
      $("escrow-next-action").innerHTML='<span>订单已完成</span><b>这笔担保已完成结算，无需继续操作。</b>';
    }
    return result;
  }

  async function refreshEscrowAfterCaseGrant(readers){
    const c=escrowContract(false);
    for(let attempt=0;attempt<10;attempt++){
      if((await Promise.all(readers.map(reader=>c.hasCaseKeyEnvelope(activeEscrow.id,reader)))).every(Boolean))break;
      await wait(1000);
    }
    const result=await loadEscrow(),granted=new Set(readers.map(reader=>String(reader).toLowerCase()));
    if(activeEscrow){activeEscrow.missingCaseReaders=(activeEscrow.missingCaseReaders||[]).filter(reader=>!granted.has(String(reader).toLowerCase()));$("escrow-grant-arbiter").classList.toggle("hidden",!activeEscrow.missingCaseReaders.length)}
    return result;
  }

  async function loadEscrowMessages(){
    const n=$("escrow-message-log");if(!activeEscrow){n.className="escrow-log empty";n.innerHTML="<small>暂无已登记消息</small>";return}
    try{
      if(!account||!signer){n.className="escrow-log empty";n.innerHTML="<small>连接订单参与钱包后可查看加密消息</small>";return}
      const c=escrowContract(),count=Number(await c.encryptedMessageCount(activeEscrow.id)),start=Math.max(0,count-30),rows=[];for(let i=start;i<count;i++)rows.push(await c.encryptedMessageAt(activeEscrow.id,i));
      if(!rows.length){n.className="escrow-log empty";n.innerHTML="<small>暂无加密消息</small>";return}
      if(!inboxIdentity||!sameAddress(inboxIdentity.wallet,account)){n.className="escrow-log";n.innerHTML=rows.reverse().map(m=>`<div class="escrow-log-item locked"><b><span>${escrowKindNames[Number(m.kind)]}</span><time>${new Date(Number(m.timestamp)*1000).toLocaleString()}</time></b><small>发送者 ${short(m.sender)} · 已加密；点击上方“开通 / 解锁信箱”后读取</small></div>`).join("");return}
      const key=await getCaseKey(),rendered=await Promise.all(rows.reverse().map(async m=>{try{const clear=await window.TapeFlowCaseCrypto.decryptCaseMessage({caseKey:key,payload:E.getBytes(m.ciphertext),chainId:CFG.chainId,escrow:configured("escrow"),caseId:activeEscrow.e.caseId}),data=JSON.parse(E.toUtf8String(clear));return `<div class="escrow-log-item"><b><span>${escrowKindNames[Number(m.kind)]}</span><time>${new Date(Number(m.timestamp)*1000).toLocaleString()}</time></b><small>发送者 ${short(m.sender)}${isZeroBytes(m.tapeSendRef)?"":" · 已同步 TapeSend"}</small><span class="message-plain">${escapeHtml(data.body)}</span>${data.note?`<span class="message-note">附件说明：${escapeHtml(data.note)}</span>`:""}</div>`}catch{return `<div class="escrow-log-item locked"><b><span>${escrowKindNames[Number(m.kind)]}</span><time>${new Date(Number(m.timestamp)*1000).toLocaleString()}</time></b><small>密文认证失败或密钥不匹配</small></div>`}}));n.className="escrow-log";n.innerHTML=rendered.join("");
    }catch(e){n.className="escrow-log empty";n.innerHTML=`<small>${errText(e)}</small>`}
  }

  async function loadMyEscrows(){try{
    await ensureWallet();
    const c=escrowContract(false),ids=new Set();
    const add=async(countFn,atFn)=>{const count=Number(await countFn(account));for(let i=Math.max(0,count-50);i<count;i++)ids.add((await atFn(account,i)).toString())};
    await Promise.all([add(c.payerEscrowCount.bind(c),c.payerEscrowAt.bind(c)),add(c.payeeEscrowCount.bind(c),c.payeeEscrowAt.bind(c)),add(c.arbiterDisputeCount.bind(c),c.arbiterDisputeAt.bind(c))]);
    const defaultArbiter=await c.defaultArbiter();
    if(sameAddress(account,defaultArbiter)){const count=Number(await c.disputeCount());for(let i=Math.max(0,count-100);i<count;i++){const id=(await c.disputeAt(i)).toString(),e=await c.escrows(id);if(Number(e.status)===5&&Math.floor(Date.now()/1000)>=Number(e.disputedAt)+15*86400)ids.add(id)}}
    const orders=await Promise.all([...ids].map(async id=>({id,e:await c.escrows(id)})));
    orders.sort((a,b)=>Number(b.id)-Number(a.id));
    const n=$("my-escrow-list");
    n.className=`escrow-list${orders.length?"":" empty"}`;
    n.innerHTML=orders.length?orders.map(({id,e})=>{
      const status=Number(e.status),role=sameAddress(account,e.payer)?"我是买方":sameAddress(account,e.payee)?"我是卖方":"我是仲裁者",t=tokenBy(e.token),code=escrowCode(id,e.createdAt);
      return `<button type="button" class="escrow-list-item status-${status}" data-escrow-open="${code}"><span class="escrow-list-state">${escrowStatusNames[status]}</span><span class="escrow-list-copy"><b>${code}</b><small>${role} · ${formatAmount(e.amount,t)} ${t.symbol}</small><small>${short(e.payer)} → ${short(e.payee)}</small></span><em>查看详情</em></button>`;
    }).join(""):"<small>当前钱包没有相关担保订单</small>";
    n.querySelectorAll("[data-escrow-open]").forEach(button=>{button.onclick=async()=>{$("escrow-id").value=button.dataset.escrowOpen;await loadEscrow();$("escrow-workspace").scrollIntoView({behavior:"smooth",block:"start"})}});
  }catch(e){const n=$("my-escrow-list");n.className="escrow-list empty";n.innerHTML=`<small>${errText(e)}</small>`}}

  async function sendEscrowTapeMessage({kind,body,note="",includeArbiter=false}){
    if(!activeEscrow)throw new Error("请先查询担保订单");if(!window.TapeFlowTapeSend)throw new Error("TapeSend加密模块没有加载");await ensureWallet();
    if(!body)throw new Error("请输入消息内容");const {id,code,e,role,status}=activeEscrow,ref=E.id(`tapeflow-escrow-${id}-${Date.now()}-${account}`),payload=JSON.stringify({type:"tapeflow.escrow.message",escrowId:id,escrowCode:code,kind:Number(kind),sender:account,body,note,createdAt:new Date().toISOString()}),destinations=[];
    if(role==="买方")destinations.push(e.payeeEndpoint);else if(role==="卖方")destinations.push(e.payerEndpoint);else if(role.includes("仲裁"))destinations.push(e.payerEndpoint,e.payeeEndpoint);else throw new Error("当前钱包不是该订单参与方");
    if((status===5||includeArbiter)&&!role.includes("仲裁")){destinations.push(e.arbiterEndpoint);if(activeEscrow.intervened)destinations.push(activeEscrow.defaultArbiterEndpoint)}
    const unique=[...new Set(destinations.filter(x=>!isZeroBytes(x)).map(String))],senderEndpoint=$("escrow-message-sender").value.trim();let nativeRef=E.ZeroHash;
    if(senderEndpoint&&unique.length){
      for(let i=0;i<unique.length;i++){setMessage("escrow-message-status",`正在发送原生 TapeSend 副本 ${i+1}/${unique.length}…`);const prepared=await window.TapeFlowTapeSend.prepareReceipt({sender:senderEndpoint,recipient:unique[i],recipientChainId:endpointChain(unique[i]),wallet:account,subject:`TapeFlow 担保 ${code} · ${escrowKindNames[Number(kind)]}`,body:payload,reference:ref,allowPublic:false});const tx=await signer.sendTransaction(prepared.tx);await tx.wait()}
      nativeRef=ref;
    }
    const key=await getCaseKey(),cipher=await window.TapeFlowCaseCrypto.encryptCaseMessage({caseKey:key,content:E.toUtf8Bytes(payload),chainId:CFG.chainId,escrow:configured("escrow"),caseId:e.caseId});if(cipher.length>4096)throw new Error("消息过长，请缩短正文或改为发送文件哈希/链接");
    await transact("escrow-message-status","发送钱包加密消息",()=>escrowContract().postEncryptedMessage(id,Number(kind),window.TapeFlowCaseCrypto.bytesToHex(cipher),nativeRef));setMessage("escrow-message-status",`加密消息已发送${nativeRef===E.ZeroHash?"":"，并同步原生 TapeSend"}。`,"success");await loadEscrowMessages();return{ref:nativeRef}
  }

  $("load-escrow").onclick=()=>loadEscrow().catch(()=>{});$("load-my-escrows").onclick=loadMyEscrows;
  $("escrow-delivered").onclick=async()=>{try{await transact("escrow-manage-status","标记已交付",()=>escrowContract().markDelivered(activeEscrow.id,E.ZeroHash,E.ZeroHash));await refreshEscrowAfterStatus(2)}catch{}};
  $("escrow-release").onclick=async()=>{try{await transact("escrow-manage-status","确认放款",()=>escrowContract().releaseEscrow(activeEscrow.id));await refreshEscrowAfterStatus(3)}catch{}};
  $("escrow-finalize").onclick=async()=>{try{await transact("escrow-manage-status","验收期后放款",()=>escrowContract().finalizeAfterReview(activeEscrow.id));await refreshEscrowAfterStatus(3)}catch{}};
  $("escrow-refund").onclick=async()=>{try{await transact("escrow-manage-status","退回未交付资金",()=>escrowContract().refundUndelivered(activeEscrow.id));await refreshEscrowAfterStatus(4)}catch{}};
  $("escrow-dispute").onclick=()=>{try{if(!activeEscrow)throw new Error("请先查询担保订单");setMessage("escrow-dispute-status","");$("escrow-dispute-dialog").showModal();setTimeout(()=>$("escrow-dispute-reason").focus(),50)}catch(e){setMessage("escrow-manage-status",errText(e),"error")}};
  $("escrow-dispute-form").addEventListener("submit",e=>{e.preventDefault();try{
    const body=$("escrow-dispute-reason").value.trim(),note=$("escrow-dispute-evidence").value.trim();if(!body)throw new Error("请填写争议原因");
    $("escrow-dispute-dialog").close();askConfirm("确认发起争议",[["订单",activeEscrow.code],["争议原因",body],["当前仲裁者",activeEscrow.e.arbiter],["证据传递","争议开启后将授权仲裁者读取完整历史"]],async()=>{await getCaseKey();await transact("escrow-manage-status","发起争议",()=>escrowContract().openDispute(activeEscrow.id,E.ZeroHash,E.ZeroHash));await loadEscrow();try{await grantCurrentCaseKey(activeEscrow.e.arbiter,"escrow-manage-status")}catch(x){setMessage("escrow-manage-status",`争议已开启，但历史授权待完成：${errText(x)}`,"error")}await sendEscrowTapeMessage({kind:3,body,note,includeArbiter:true});$("escrow-dispute-reason").value="";$("escrow-dispute-evidence").value="";await loadEscrow()})
  }catch(x){setMessage("escrow-dispute-status",errText(x),"error")}});
  $("escrow-message-form").addEventListener("submit",async e=>{e.preventDefault();try{await sendEscrowTapeMessage({kind:Number($("escrow-message-kind").value),body:$("escrow-message-body").value.trim(),note:$("escrow-evidence-note").value.trim()});$("escrow-message-body").value="";$("escrow-evidence-note").value=""}catch(x){setMessage("escrow-message-status",errText(x),"error")}});
  $("escrow-fallback-approve").onclick=async()=>{try{await transact("escrow-fallback-status","确认改由 TapeFlow 仲裁",()=>escrowContract().approveTapeFlowFallback(activeEscrow.id));await loadEscrow()}catch{}};
  $("escrow-grant-arbiter").onclick=async()=>{try{const readers=[...(activeEscrow.missingCaseReaders||[activeEscrow.e.arbiter])];for(const reader of readers)await grantCurrentCaseKey(reader);await refreshEscrowAfterCaseGrant(readers);setMessage("escrow-message-status","授权已确认，仲裁者现在可以读取完整历史。","success")}catch(e){setMessage("escrow-message-status",errText(e),"error")}};
  $("escrow-intervene").onclick=async()=>{try{await transact("escrow-arbitration-status","TapeFlow接入仲裁",()=>escrowContract().activateTapeFlowIntervention(activeEscrow.id));await loadEscrow()}catch{}};
  $("escrow-arbitration-form").addEventListener("submit",e=>{e.preventDefault();try{const readAward=id=>{const v=$(id).value;if(v===""||Number(v)<0)throw new Error("裁决金额不能为负数");return E.parseUnits(v||"0",activeEscrow.t.decimals)},payerAmount=readAward("escrow-payer-award"),payeeAmount=readAward("escrow-payee-award"),reason=$("escrow-resolution-reason").value.trim();if(!reason)throw new Error("请填写裁决理由");if(payerAmount+payeeAmount!==activeEscrow.e.amount)throw new Error("买方与卖方金额之和必须等于担保总额");askConfirm("确认仲裁裁决",[["退还买方",`${$("escrow-payer-award").value} ${activeEscrow.t.symbol}`],["支付卖方",`${$("escrow-payee-award").value} ${activeEscrow.t.symbol}`],["提醒","提交后立即结算，不能撤回"]],async()=>{await transact("escrow-arbitration-status","提交仲裁裁决",()=>escrowContract().resolveEscrow(activeEscrow.id,payerAmount,payeeAmount,hashText(reason)));$("escrow-arbitration-form").classList.add("hidden");await refreshEscrowAfterStatus(6)})}catch(x){setMessage("escrow-arbitration-status",errText(x),"error")}});

  $("schedule-form").addEventListener("submit",e=>{e.preventDefault();try{const token=selected("schedule-token"),payee=validAddress($("schedule-payee").value),units=parseAmount($("schedule-amount").value,token),release=Math.floor(new Date($("schedule-time").value).getTime()/1000),cancelable=$("schedule-cancelable").checked;askConfirm("确认定时付款",[["收款人",payee],["金额",`${$("schedule-amount").value} ${token.symbol}`],["到账时间",new Date(release*1000).toLocaleString()]],async()=>{const receipt=await transact("schedule-status","创建定时付款",async()=>{const h=hub();await approveIfNeeded(token,await h.getAddress(),units,"schedule-status");return h.createSchedule(token.address,payee,units,release,cancelable,hashText($("schedule-memo").value),token.address===ZERO?{value:units}:{})});const id=findEventId(receipt,"Scheduled","scheduleId")||await recoverScheduleId({payer:account,payee,token:token.address,amount:units,releaseTime:release,cancelable});if(!id)throw new Error("付款已创建，但暂时无法读取任务编号；请稍后刷新再查询");$("schedule-id").value=id;await loadSchedule();setMessage("schedule-manage-status",`已自动载入任务 #${id}，可以领取或取消。`,"success")})}catch(e2){setMessage("schedule-status",errText(e2),"error")}});
  async function recoverScheduleId(expected){const h=hub(false),next=await h.nextScheduleId(),id=next-1n;if(id<1n)return;const s=await h.schedules(id);if(!sameAddress(s.payer,expected.payer)||!sameAddress(s.payee,expected.payee)||!sameAddress(s.token,expected.token)||s.amount!==expected.amount||Number(s.releaseTime)!==Number(expected.releaseTime)||Boolean(s.cancelable)!==Boolean(expected.cancelable))return;return id.toString()}
  async function loadSchedule(){try{
    const id=$("schedule-id").value.trim();if(!/^\d+$/.test(id)||BigInt(id)<1n)throw new Error("请输入正确的任务编号");
    const s=await hub(false).schedules(id),t=tokenBy(s.token),releaseTime=Number(s.releaseTime),matured=Math.floor(Date.now()/1000)>=releaseTime,terminal=s.claimed||s.cancelled,isPayer=Boolean(account)&&sameAddress(account,s.payer),st=s.claimed?"已领取":s.cancelled?"已取消":matured?"已到期，可领取":"等待到账";
    $("schedule-detail").innerHTML=`<b>${st} · #${id}</b><br>${formatAmount(s.amount,t)} ${t.symbol}<br>付款 ${short(s.payer)} · 收款 ${short(s.payee)}<br>${new Date(releaseTime*1000).toLocaleString()}<br><small>${s.cancelable?"到期前可由付款人取消":"创建后不可取消，只能到期领取"}</small>`;
    const claim=$("schedule-claim"),cancel=$("schedule-cancel");claim.disabled=Boolean(terminal||!matured||!account);claim.textContent=s.claimed?"已领取":s.cancelled?"已取消":!matured?"未到期":!account?"连接钱包领取":"到期领取";cancel.disabled=Boolean(terminal||!s.cancelable||matured||!isPayer);cancel.textContent=s.cancelled?"已退款":s.claimed?"已领取":!s.cancelable?"不可取消":matured?"已到期":!isPayer?"仅付款人可取消":"取消并退款";
  }catch(e){setMessage("schedule-manage-status",errText(e),"error")}}
  $("load-schedule").onclick=loadSchedule;$("schedule-claim").onclick=async()=>{try{await transact("schedule-manage-status","领取定时付款",()=>hub().claimSchedule($("schedule-id").value));await loadSchedule()}catch{}};$("schedule-cancel").onclick=async()=>{try{await transact("schedule-manage-status","取消定时付款",()=>hub().cancelSchedule($("schedule-id").value));await loadSchedule()}catch{}};

  const lockConditionNames=["时间到达","价格达到","时间与价格都满足","时间或价格满足一个"];
  const lockUsesPrice=(condition)=>Number(condition)!==0;
  const lockUsesTime=(condition)=>Number(condition)!==1;
  const toInputTime=(seconds)=>{const d=new Date(seconds*1000-datetimeOffset(seconds));return d.toISOString().slice(0,16)};
  const datetimeOffset=(seconds)=>new Date(seconds*1000).getTimezoneOffset()*60000;
  function initLockTimes(){const now=Math.floor(Date.now()/1000);if(!$("lock-time").value)$("lock-time").value=toInputTime(now+30*86400);if(!$("lock-fallback").value)$("lock-fallback").value=toInputTime(now+365*86400)}
  function lockUI(){
    const gift=lockKind==="gift",condition=Number($("lock-condition").value),usesPrice=lockUsesPrice(condition),usesTime=lockUsesTime(condition);
    $$('[data-lock-kind]').forEach(n=>n.classList.toggle("active",n.dataset.lockKind===lockKind));
    $("lock-beneficiary-row").classList.toggle("hidden",!gift);$("lock-time-row").classList.toggle("hidden",!usesTime);$("lock-price-fields").classList.toggle("hidden",!usesPrice);
    $("lock-time").required=usesTime;$("lock-target-price").required=usesPrice;$("lock-fallback").required=usesPrice;
    $("lock-form-title").textContent=gift?"创建赠送锁仓":"创建自己的锁仓";initLockTimes();
  }
  $$('[data-lock-kind]').forEach(n=>n.onclick=()=>{lockKind=n.dataset.lockKind;lockUI()});
  $("lock-condition").onchange=lockUI;
  $("lock-form").addEventListener("submit",async e=>{e.preventDefault();try{
    configured("lock");await ensureWallet();
    const token=selected("lock-token"),amount=$("lock-amount").value,units=parseAmount(amount,token),condition=Number($("lock-condition").value),usesPrice=lockUsesPrice(condition),usesTime=lockUsesTime(condition);
    const beneficiary=lockKind==="self"?account:validAddress($("lock-beneficiary").value,"被赠送人地址");
    const unlockTime=usesTime?Math.floor(new Date($("lock-time").value).getTime()/1000):0;
    const fallbackTime=usesPrice?Math.floor(new Date($("lock-fallback").value).getTime()/1000):0;
    if(usesPrice)validAddress(settings.priceOracle||"","TapeFlow价格注册表");
    const target=usesPrice?E.parseUnits($("lock-target-price").value||"0",18):0n;
    const direction=usesPrice?Number($("lock-direction").value):0,confirmation=usesPrice?Number($("lock-confirmation").value):0;
    if(usesTime&&unlockTime<=Math.floor(Date.now()/1000)+120)throw new Error("最早解锁时间至少应晚于当前时间2分钟");
    if(usesPrice){if(target<=0n)throw new Error("请输入目标价格");if(fallbackTime<=Math.floor(Date.now()/1000)+120)throw new Error("请设置有效的最晚强制解锁时间");const oracle=await lockVault(false).ORACLE();if(oracle.toLowerCase()!==settings.priceOracle.toLowerCase())throw new Error("锁仓合约与价格注册表不匹配")}
    const rows=[["类型",lockKind==="self"?"给自己锁仓":"赠送锁仓"],["资产",`${amount} ${token.symbol}`],["受益地址",beneficiary],["释放规则",lockConditionNames[condition]]];
    if(usesTime)rows.push(["最早时间",new Date(unlockTime*1000).toLocaleString()]);if(usesPrice)rows.push(["目标价格",`${direction===0?"≥":"≤"} ${$("lock-target-price").value} USD`],["保底时间",new Date(fallbackTime*1000).toLocaleString()]);
    askConfirm("确认创建锁仓",rows,async()=>{
      const receipt=await transact("lock-status","创建锁仓",async()=>{const vault=lockVault();await approveIfNeeded(token,await vault.getAddress(),units,"lock-status");return vault.createLock(token.address,beneficiary,units,unlockTime,fallbackTime,condition,direction,target,confirmation,hashText($("lock-memo").value),token.address===ZERO?{value:units}:{})});
      const id=findLockEventId(receipt);if(id){$("lock-id").value=id;$("lock-query-address").value=beneficiary;await refreshLockAfterCreate(id);const link=makeLink("lock",{id});navigator.clipboard?.writeText(link).catch(()=>{});setMessage("lock-status",`锁仓 #${id} 已创建，查询链接已复制。`,"success")}
    });
  }catch(x){setMessage("lock-status",errText(x),"error")}});

  async function refreshLockAfterCreate(id){
    for(let attempt=0;attempt<8;attempt++){
      const position=await loadLock({quiet:true});if(position){await loadBeneficiaryLocks();return true}
      $("lock-detail").innerHTML=`<b>链上已确认 · #${id}</b><br><small>公共节点正在同步锁仓记录，请稍候…</small>`;setMessage("lock-manage-status","交易已经确认，正在同步锁仓记录…");if(attempt<7)await wait(1200)
    }
    $("lock-detail").innerHTML=`<b>链上已确认 · #${id}</b><br><small>节点同步稍慢，请稍后点击“查询”。</small>`;setMessage("lock-manage-status","锁仓已经创建，节点同步稍慢；任务编号已为你保留。","success");return false
  }
  async function loadLock(options={}){
    const quiet=Boolean(options&&options.quiet);
    const id=$("lock-id").value.trim();if(!id){setMessage("lock-manage-status","请输入锁仓编号","error");return}
    try{
      const vault=lockVault(false),position=await vault.locks(id);if(position.creator===ZERO)throw new Error("锁仓不存在");
      const token=tokenBy(position.token),condition=Number(position.condition),usesPrice=lockUsesPrice(condition),claimed=Boolean(position.claimed);let statusData=null,statusError="";
      try{statusData=await vault.status(id)}catch(error){statusError=errText(error)}
      const timeText=position.unlockTime>0n?new Date(Number(position.unlockTime)*1000).toLocaleString():"不限制";
      const fallbackText=position.fallbackTime>0n?new Date(Number(position.fallbackTime)*1000).toLocaleString():"无";
      const priceText=usesPrice?`${Number(position.direction)===0?"≥":"≤"} ${Number(E.formatUnits(position.targetPriceE18,18)).toLocaleString(undefined,{maximumFractionDigits:8})} USD`:"不限制";
      const canClaim=statusData?Boolean(statusData.claimable):false;
      $("lock-detail").innerHTML=`<b>${claimed?"已释放":canClaim?"可以释放":"锁仓中"} · #${id}</b><br>${formatAmount(position.amount,token)} ${token.symbol}<br>受益人 ${short(position.beneficiary)}<br>规则 ${lockConditionNames[condition]}<div class="lock-progress"><div><span>时间条件</span><strong class="${statusData&&statusData.timeMet?"ok":"wait"}">${statusData&&statusData.timeMet?"已满足":"等待中"} · ${timeText}</strong></div>${usesPrice?`<div><span>价格条件</span><strong class="${statusData&&statusData.priceConfirmed?"ok":"wait"}">${statusData&&statusData.priceConfirmed?"已确认":"待确认"} · ${priceText}</strong></div><div><span>最晚解锁</span><strong>${fallbackText}</strong></div>`:""}</div>${statusError?`<small>价格状态暂不可用：${statusError}</small>`:""}`;
      $("lock-check-price").classList.toggle("hidden",!usesPrice||claimed);$("lock-claim").classList.toggle("hidden",claimed);$("lock-claim").disabled=!canClaim;
      setMessage("lock-manage-status",claimed?"资产已经释放到受益地址。":canClaim?"条件已经满足，任何人都可以触发释放。":"条件尚未满足。",claimed||canClaim?"success":"");return position;
    }catch(x){if(!quiet){setMessage("lock-manage-status",errText(x),"error");$("lock-detail").textContent="未找到锁仓记录"}return null}
  }
  async function loadBeneficiaryLocks(){
    try{
      const beneficiary=validAddress($("lock-query-address").value,"受益地址"),vault=lockVault(false),count=Number(await vault.beneficiaryLockCount(beneficiary)),take=Math.min(count,20),ids=[];
      for(let i=0;i<take;i++)ids.push(await vault.beneficiaryLockAt(beneficiary,count-1-i));
      if(!ids.length){$("lock-list").className="lock-list empty";$("lock-list").innerHTML='<div class="lock-empty-icon">锁</div><b>没有查到锁仓</b><small>请确认地址和X Layer网络</small>';return}
      const positions=await Promise.all(ids.map(id=>vault.locks(id)));$("lock-list").className="lock-list";$("lock-list").innerHTML=positions.map((p,i)=>{const t=tokenBy(p.token),state=p.claimed?"已释放":"锁仓中";return `<button class="lock-list-item" type="button" data-lock-id="${ids[i]}"><i>锁</i><span><b>${formatAmount(p.amount,t)} ${t.symbol}</b><small>${lockConditionNames[Number(p.condition)]} · #${ids[i]}</small></span><em>${state}</em></button>`}).join("");
      $$('[data-lock-id]').forEach(n=>n.onclick=()=>{$("lock-id").value=n.dataset.lockId;loadLock()});
    }catch(x){setMessage("lock-manage-status",errText(x),"error")}
  }
  $("load-lock").onclick=()=>loadLock();$("load-beneficiary-locks").onclick=loadBeneficiaryLocks;
  $("lock-use-my-address").onclick=async()=>{try{await ensureWallet();$("lock-query-address").value=account;await loadBeneficiaryLocks()}catch(x){setMessage("lock-manage-status",errText(x),"error")}};
  $("lock-check-price").onclick=async()=>{try{await transact("lock-manage-status","检查价格条件",()=>lockVault().checkPrice($("lock-id").value));await loadLock()}catch{}};
  $("lock-claim").onclick=async()=>{try{await transact("lock-manage-status","释放锁仓",()=>lockVault().claim($("lock-id").value));await loadLock();await loadBeneficiaryLocks()}catch{}};

  const PRIVACY_ENTRY_ABI=["function deposit(uint256 precommitment) payable returns(uint256)","function scopeToPool(uint256) view returns(address)","function latestRoot() view returns(uint256)","function associationSets(uint256) view returns(uint256 root,string ipfsCID,uint256 timestamp)"];
  const PRIVACY_POOL_ABI=["function SCOPE() view returns(uint256)","function ENTRYPOINT() view returns(address)","function WITHDRAWAL_VERIFIER() view returns(address)","function RAGEQUIT_VERIFIER() view returns(address)","function currentRoot() view returns(uint256)","function currentTreeDepth() view returns(uint256)","function dead() view returns(bool)","function ragequit((uint256[2] pA,uint256[2][2] pB,uint256[2] pC,uint256[4] pubSignals) proof)"];
  let privacyCoreReady=false,privacyReady=false,privacyRuntime=null,privacyWithdrawalSession=null;
  function privacyPoolInfo(scope){return{chainId:196,address:E.getAddress(P3.pool),scope,deploymentBlock:BigInt(P3.deploymentBlock)}}
  function privacyStatus(id,text,ok){const n=$(id);if(!n)return;n.textContent=text;n.classList.toggle("ok",ok);n.classList.toggle("bad",!ok)}
  async function jsonHealth(url,path){const r=await fetch(`${url.replace(/\/$/,"")}${path}`,{headers:{accept:"application/json"},cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const type=r.headers.get("content-type")||"";return type.includes("json")?r.json():{ok:(await r.text()).trim().toLowerCase()==="pong"}}
  function privacyDataService(){return new window.TapeFlowPrivacy.DataService([{chainId:196,rpcUrl:CFG.services.privacyRpc,startBlock:BigInt(P3.deploymentBlock),timeout:30000,retryCount:4}],new Map([[196,{blockChunkSize:100,concurrency:1,chunkDelayMs:125,retryOnFailure:true,maxRetries:5,retryBaseDelayMs:1000}]]))}
  async function privacySnapshotDataService(){
    const response=await fetch(`${P3.asp.replace(/\/$/,"")}/events`,{headers:{accept:"application/json"},cache:"no-store"});
    if(!response.ok)throw new Error(`公开事件快照暂不可用 · HTTP ${response.status}`);
    const snapshot=await response.json();
    if(snapshot?.ok!==true||Number(snapshot.chainId)!==196||!E.isAddress(snapshot.pool)||E.getAddress(snapshot.pool)!==E.getAddress(P3.pool)||!Array.isArray(snapshot.deposits)||!Array.isArray(snapshot.withdrawals)||!Array.isArray(snapshot.ragequits))throw new Error("公开事件快照格式无效");
    const deposits=snapshot.deposits.map(item=>({depositor:E.getAddress(item.depositor).toLowerCase(),commitment:BigInt(item.commitment),label:BigInt(item.label),value:BigInt(item.value),precommitment:BigInt(item.precommitment),blockNumber:BigInt(item.blockNumber),transactionHash:item.transactionHash,logIndex:Number(item.logIndex||0)}));
    const withdrawals=snapshot.withdrawals.map(item=>({withdrawn:BigInt(item.withdrawn),spentNullifier:BigInt(item.spentNullifier),newCommitment:BigInt(item.newCommitment),blockNumber:BigInt(item.blockNumber),transactionHash:item.transactionHash}));
    const ragequits=snapshot.ragequits.map(item=>({ragequitter:E.getAddress(item.ragequitter).toLowerCase(),commitment:BigInt(item.commitment),label:BigInt(item.label),value:BigInt(item.value),blockNumber:BigInt(item.blockNumber),transactionHash:item.transactionHash}));
    return{getDeposits:async()=>deposits,getWithdrawals:async()=>withdrawals,getRagequits:async()=>ragequits};
  }
  async function createFreshPrivacyRuntime(mnemonic){
    if(!window.TapeFlowPrivacy)throw new Error("本地证明SDK没有加载");
    const scope=BigInt(await new E.Contract(P3.pool,PRIVACY_POOL_ABI,readProvider()).SCOPE()),data=privacyDataService(),account=new window.TapeFlowPrivacy.AccountService(data,{mnemonic,includeEmptyNodes:false,poolConcurrency:1});
    return{scope,pool:privacyPoolInfo(scope),data,account};
  }
  async function loadPrivacyRuntime(mnemonic,{allowRpcFallback=false}={}){
    if(!window.TapeFlowPrivacy)throw new Error("本地证明SDK没有加载");
    const pool=new E.Contract(P3.pool,PRIVACY_POOL_ABI,readProvider()),scope=BigInt(await pool.SCOPE());
    let data;try{data=await privacySnapshotDataService()}catch(error){if(!allowRpcFallback)throw error;data=privacyDataService()}
    const restored=await window.TapeFlowPrivacy.AccountService.initializeWithEvents(data,{mnemonic},[privacyPoolInfo(scope)],{includeEmptyNodes:false,poolConcurrency:1});
    if(restored.errors.length)throw new Error(`链上历史读取不完整：${restored.errors[0].reason||"RPC错误"}`);
    return{scope,pool,data,account:restored.account,legacyAccount:restored.legacyAccount};
  }
  async function checkPrivacyHealth(){
    privacyCoreReady=false;privacyReady=false;privacyRuntime=null;$("shielded-deposit-submit").disabled=true;$("shielded-balance-load").disabled=true;$("shielded-withdraw-submit").disabled=true;$("shielded-ragequit-submit").disabled=true;
    const failures=[];
    setMessage("privacy-health-status","正在核验合约字节码、电路哈希、ASP与Relayer…");
    try{
      if(!E.isAddress(P3.entrypoint||"")||!E.isAddress(P3.pool||"")||!Number.isSafeInteger(P3.deploymentBlock)||P3.deploymentBlock<=0)throw new Error("EntryPoint、资金池或部署区块尚未写入公开配置");
      const provider=readProvider(),entryCode=await provider.getCode(P3.entrypoint),poolCode=await provider.getCode(P3.pool);if(entryCode==="0x"||poolCode==="0x")throw new Error("EntryPoint或资金池地址没有主网字节码");
      const pool=new E.Contract(P3.pool,PRIVACY_POOL_ABI,provider),[entry,withdrawVerifier,ragequitVerifier,scope,dead]=await Promise.all([pool.ENTRYPOINT(),pool.WITHDRAWAL_VERIFIER(),pool.RAGEQUIT_VERIFIER(),pool.SCOPE(),pool.dead()]);
      if(E.getAddress(entry)!==E.getAddress(P3.entrypoint)||dead)throw new Error(dead?"隐私池已停止接受存款":"资金池绑定的EntryPoint与配置不一致");
      const [withdrawCode,ragequitCode,mappedPool]=await Promise.all([provider.getCode(withdrawVerifier),provider.getCode(ragequitVerifier),new E.Contract(P3.entrypoint,PRIVACY_ENTRY_ABI,provider).scopeToPool(scope)]);if(withdrawCode==="0x"||ragequitCode==="0x")throw new Error("Verifier字节码缺失");if(E.getAddress(mappedPool)!==E.getAddress(P3.pool))throw new Error("EntryPoint未登记该资金池");
      privacyStatus("privacy-verifier-status",`已核验 · ${short(withdrawVerifier)} / ${short(ragequitVerifier)}`,true);privacyStatus("privacy-pool-status",`已核验 · scope ${String(scope).slice(0,10)}…`,true);
    }catch(x){failures.push(errText(x));privacyStatus("privacy-verifier-status","未通过",false);privacyStatus("privacy-pool-status","未通过",false)}
    try{
      if(!window.TapeFlowPrivacy)throw new Error("浏览器证明SDK没有加载");const circuits=new window.TapeFlowPrivacy.Circuits({baseUrl:new URL("./",location.href).href,browser:true});await circuits.initArtifacts("latest");privacyRuntime={circuits,sdk:new window.TapeFlowPrivacy.PrivacyPoolSDK(circuits)};privacyStatus("privacy-prover-status","已核验 · 本地电路哈希匹配",true);
    }catch(x){failures.push(errText(x));privacyStatus("privacy-prover-status","未通过",false)}
    privacyCoreReady=$("privacy-pool-status").classList.contains("ok")&&$("privacy-verifier-status").classList.contains("ok")&&$("privacy-prover-status").classList.contains("ok");
    $("shielded-ragequit-submit").disabled=!privacyCoreReady;
    try{if(!P3.asp)throw new Error("ASP服务尚未配置");const asp=await jsonHealth(P3.asp,"/health");if(asp.ok!==true||Number(asp.chainId)!==196||asp.serviceWalletsFunded!==true)throw new Error("ASP健康检查未通过");privacyStatus("privacy-asp-status","在线 · X Layer",true)}catch(x){failures.push(errText(x));privacyStatus("privacy-asp-status","未通过",false)}
    try{if(!P3.relayer)throw new Error("Relayer尚未配置");await jsonHealth(P3.relayer,"/ping");privacyStatus("privacy-relayer-status","在线",true)}catch(x){failures.push(errText(x));privacyStatus("privacy-relayer-status","未通过",false)}
    privacyReady=privacyCoreReady&&$("privacy-asp-status").classList.contains("ok")&&$("privacy-relayer-status").classList.contains("ok");
    if(privacyReady){$("shielded-deposit-submit").disabled=false;$("shielded-deposit-submit").textContent="下载恢复文件并存款";$("shielded-balance-load").disabled=false;setMessage("privacy-health-status","全部门槛通过，已开放主网操作。","success")}else setMessage("privacy-health-status",`${failures.join("；")||"主网上线门槛未通过"}；公众存款保持关闭${privacyCoreReady?"，紧急退出仍可用":""}。`,"error");
    return privacyReady;
  }
  function assertPrivacyStack(){if(!privacyReady)throw new Error("主网上线门槛尚未全部通过，公众存款保持关闭")}
  function assertPrivacyRecoveryStack(){if(!privacyCoreReady)throw new Error("合约或本地证明器未通过核验，暂时不能安全执行紧急退出")}
  async function encryptRecovery(payload,password){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]),key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt"]),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)));return{format:"tapeflow-p3-recovery",version:1,kdf:{name:"PBKDF2",hash:"SHA-256",iterations:600000,salt:E.hexlify(salt)},cipher:{name:"AES-256-GCM",iv:E.hexlify(iv),data:E.hexlify(new Uint8Array(cipher))}}}
  async function decryptRecovery(file,password){
    if(!file||file.size<128||file.size>131072)throw new Error("恢复文件大小异常");
    if(String(password||"").length<12)throw new Error("恢复文件密码至少12位");
    let doc;try{doc=JSON.parse(await file.text())}catch{throw new Error("恢复文件不是有效JSON")}
    if(doc?.format!=="tapeflow-p3-recovery"||doc?.version!==1||doc?.kdf?.name!=="PBKDF2"||doc?.kdf?.hash!=="SHA-256"||doc?.kdf?.iterations!==600000||doc?.cipher?.name!=="AES-256-GCM")throw new Error("恢复文件格式或KDF参数不受支持");
    try{
      const salt=E.getBytes(doc.kdf.salt),iv=E.getBytes(doc.cipher.iv),cipher=E.getBytes(doc.cipher.data);if(salt.length!==16||iv.length!==12||cipher.length<17||cipher.length>65536)throw new Error("invalid envelope");
      const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]),key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:doc.kdf.iterations,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher),data=JSON.parse(new TextDecoder().decode(plain));
      if(data.chainId!==196||!data.mnemonic||!E.isAddress(data.entrypoint)||!E.isAddress(data.pool))throw new Error("wrong network");
      if(E.getAddress(data.entrypoint)!==E.getAddress(P3.entrypoint)||E.getAddress(data.pool)!==E.getAddress(P3.pool)||Number(data.deploymentBlock)!==P3.deploymentBlock)throw new Error("wrong deployment");
      E.Mnemonic.fromPhrase(data.mnemonic);return data
    }catch{throw new Error("密码错误、文件损坏或不属于当前X Layer隐私池")}
  }
  function downloadRecovery(doc){const blob=new Blob([JSON.stringify(doc,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`tapeflow-p3-xlayer-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  function solidityProof(payload){return{pA:[payload.proof.pi_a[0],payload.proof.pi_a[1]],pB:[[payload.proof.pi_b[0][1],payload.proof.pi_b[0][0]],[payload.proof.pi_b[1][1],payload.proof.pi_b[1][0]]],pC:[payload.proof.pi_c[0],payload.proof.pi_c[1]],pubSignals:payload.publicSignals}}
  function privacyFileKey(file){return file?`${file.name}:${file.size}:${file.lastModified}`:""}
  function resetPrivacyWithdrawalSession(){privacyWithdrawalSession=null;$("shielded-balance-card").classList.add("hidden");$("shielded-available-balance").textContent="—";$("shielded-max-withdraw").textContent="—";$("shielded-note-count").textContent="—";$("shielded-withdraw-amount").value="";$("shielded-withdraw-amount").disabled=true;$("shielded-use-max").disabled=true;$("shielded-withdraw-submit").disabled=true}
  async function loadPrivacyBalance(){
    try{
      assertPrivacyStack();const file=$("shielded-note-file").files[0];if(!file)throw new Error("请选择恢复文件");
      setMessage("shielded-withdraw-status","第1/3步：正在本机解密恢复文件…");
      const recovery=await decryptRecovery(file,$("shielded-note-password").value);
      setMessage("shielded-withdraw-status","第2/3步：正在下载已确认的公开事件快照…");
      const runtime=await loadPrivacyRuntime(recovery.mnemonic),notes=runtime.account.getSpendableCommitments().get(runtime.scope)||[];
      if(!notes.length)throw new Error("该恢复文件当前没有可转出的余额");
      const total=notes.reduce((sum,n)=>sum+n.value,0n),max=notes.reduce((value,n)=>n.value>value?n.value:value,0n);
      privacyWithdrawalSession={fileKey:privacyFileKey(file),runtime,notes,total,max,loadedAt:Date.now()};
      $("shielded-available-balance").textContent=`${E.formatEther(total)} OKB`;$("shielded-max-withdraw").textContent=`${E.formatEther(max)} OKB`;$("shielded-note-count").textContent=notes.length===1?"1 笔可用承诺；可以一次全部转出。":`${notes.length} 笔可用承诺；单次提款不能超过其中最大一笔。`;
      $("shielded-balance-card").classList.remove("hidden");$("shielded-withdraw-amount").disabled=false;$("shielded-use-max").disabled=false;$("shielded-withdraw-submit").disabled=false;$("shielded-withdraw-amount").value=E.formatEther(max);
      setMessage("shielded-withdraw-status","第3/3步：余额读取完成，请核对金额和收款地址。","success");
    }catch(x){resetPrivacyWithdrawalSession();setMessage("shielded-withdraw-status",errText(x),"error")}
  }
  $("privacy-health-check").onclick=checkPrivacyHealth;
  $("shielded-balance-load").onclick=loadPrivacyBalance;
  $("shielded-use-max").onclick=()=>{if(privacyWithdrawalSession)$("shielded-withdraw-amount").value=E.formatEther(privacyWithdrawalSession.max)};
  $("shielded-note-file").addEventListener("change",resetPrivacyWithdrawalSession);$("shielded-note-password").addEventListener("input",resetPrivacyWithdrawalSession);
  $("shielded-deposit-form").addEventListener("submit",async e=>{e.preventDefault();try{assertPrivacyStack();await ensureWallet();const amount=$("shielded-amount").value,units=E.parseUnits(amount,18);if(units<E.parseEther("0.0005"))throw new Error("最低存款为0.0005 OKB");const pass=$("shielded-backup-password").value;if(pass.length<12)throw new Error("恢复文件密码至少12位");if(pass!==$("shielded-backup-password-confirm").value)throw new Error("两次密码不一致");if(!$("shielded-backup-confirm").checked)throw new Error("请先确认备份恢复文件");setMessage("shielded-deposit-status","正在本机生成新的恢复账户…");const mnemonic=E.Mnemonic.fromEntropy(E.randomBytes(32)).phrase,runtime=await createFreshPrivacyRuntime(mnemonic),secrets=runtime.account.createDepositSecrets(runtime.scope),backup=await encryptRecovery({mnemonic,chainId:196,entrypoint:E.getAddress(P3.entrypoint),pool:E.getAddress(P3.pool),deploymentBlock:P3.deploymentBlock,createdAt:new Date().toISOString()},pass);downloadRecovery(backup);await new Promise(resolve=>setTimeout(resolve,500));askConfirm("确认P3隐私池存款",[["网络","X Layer 主网"],["资产",`${amount} OKB`],["服务费","由EntryPoint按链上配置收取"],["恢复材料","已触发加密文件下载"],["风险","文件和密码必须离线保存"]],async()=>{await transact("shielded-deposit-status","P3隐私池存款",()=>new E.Contract(P3.entrypoint,PRIVACY_ENTRY_ABI,signer).deposit(secrets.precommitment,{value:units}));$("shielded-backup-password").value="";$("shielded-backup-password-confirm").value="";setMessage("shielded-deposit-status","存款已确认。请把加密恢复文件与密码分开保存。","success")})}catch(x){setMessage("shielded-deposit-status",errText(x),"error")}});
  $("shielded-withdraw-form").addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      assertPrivacyStack();
      const recipient=validAddress($("shielded-recipient").value,"收款地址"),amount=E.parseUnits($("shielded-withdraw-amount").value,18),file=$("shielded-note-file").files[0];
      if(amount<=0n)throw new Error("转出金额必须大于0");
      if(!file)throw new Error("请选择恢复文件");
      if(!privacyWithdrawalSession||privacyWithdrawalSession.fileKey!==privacyFileKey(file))throw new Error("请先读取该恢复文件的可用余额");
      if(Date.now()-privacyWithdrawalSession.loadedAt>300000)throw new Error("余额快照已超过5分钟，请重新读取余额");
      const {runtime,notes}=privacyWithdrawalSession,note=notes.find(n=>n.value>=amount);
      if(!note)throw new Error("没有一笔承诺足以支付该金额；请降低金额或逐笔退出");
      setMessage("shielded-withdraw-status","正在获取最新ASP成员证明与Relayer报价…");
      const request={chainId:196,pool:P3.pool,scope:runtime.scope.toString(),recipient,amount:amount.toString(),commitment:note.hash.toString(),label:note.label.toString()};
      const response=await fetch(`${P3.asp.replace(/\/$/,"")}/withdrawal-input`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(request)});
      if(!response.ok)throw new Error(`ASP拒绝生成成员证明 · HTTP ${response.status}`);
      const input=await response.json(),feeBPS=Number(input.relayFeeBPS);
      if(!input?.withdrawal||!input?.stateMerkleProof||!input?.aspMerkleProof||!Number.isSafeInteger(Number(input.leaseExpiresAt))||!Number.isSafeInteger(feeBPS)||feeBPS<0||feeBPS>500)throw new Error("ASP响应缺少有效证明材料或动态费率超过5%上限");
      if(String(input.feeCommitment?.amount)!==amount.toString())throw new Error("Relayer签名报价金额不匹配");
      const feeAmount=amount*BigInt(feeBPS)/10000n,netAmount=amount-feeAmount;
      setMessage("shielded-withdraw-status","报价已生成，请核对动态转出费后确认生成证明。");
      askConfirm("确认普通私密转出",[["转出总额",`${E.formatEther(amount)} OKB`],["动态转出费",`${feeBPS/100}% · ${E.formatEther(feeAmount)} OKB`],["收款人预计到账",`${E.formatEther(netAmount)} OKB`],["完整收款地址",recipient]],async()=>{
        try{
          const next=runtime.account.createWithdrawalSecrets(note),toProof=p=>({root:BigInt(p.root),leaf:BigInt(p.leaf),index:Number(p.index),siblings:p.siblings.map(x=>BigInt(x))}),proofInput={context:BigInt(window.TapeFlowPrivacy.calculateContext(input.withdrawal,runtime.scope)),withdrawalAmount:amount,stateMerkleProof:toProof(input.stateMerkleProof),aspMerkleProof:toProof(input.aspMerkleProof),stateRoot:window.TapeFlowPrivacy.bigintToHash(BigInt(input.stateRoot)),stateTreeDepth:BigInt(input.stateTreeDepth),aspRoot:window.TapeFlowPrivacy.bigintToHash(BigInt(input.aspRoot)),aspTreeDepth:BigInt(input.aspTreeDepth),newSecret:next.secret,newNullifier:next.nullifier};
          setMessage("shielded-withdraw-status","正在本机生成ZK证明；秘密不会离开浏览器…");
          const payload=await privacyRuntime.sdk.proveWithdrawal(note,proofInput);
          if(Date.now()+30000>=Number(input.leaseExpiresAt))throw new Error("证明生成耗时过长，请重新提交以获取最新根");
          const relayBody={chainId:196,scope:runtime.scope.toString(),withdrawal:input.withdrawal,proof:payload.proof,publicSignals:payload.publicSignals,feeCommitment:input.feeCommitment},relay=await fetch(`${P3.relayer.replace(/\/$/,"")}/relayer/request`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(relayBody)});
          if(!relay.ok)throw new Error(`Relayer提交失败 · HTTP ${relay.status}`);
          const result=await relay.json();
          if(result?.success!==true||!/^0x[0-9a-fA-F]{64}$/.test(result?.txHash||""))throw new Error("Relayer未广播交易，请稍后重试");
          setMessage("shielded-withdraw-status",`私密转出已提交 · ${short(result.txHash)}`,"success");resetPrivacyWithdrawalSession();$("shielded-note-password").value="";
        }catch(x){setMessage("shielded-withdraw-status",errText(x),"error")}
      });
    }catch(x){setMessage("shielded-withdraw-status",errText(x),"error")}
    finally{$("shielded-note-password").value=""}
  });
  $("shielded-ragequit-form").addEventListener("submit",async e=>{e.preventDefault();try{assertPrivacyRecoveryStack();await ensureWallet();const file=$("shielded-ragequit-file").files[0];if(!file)throw new Error("请选择恢复文件");const recovery=await decryptRecovery(file,$("shielded-ragequit-password").value);setMessage("shielded-ragequit-status","正在恢复账户并在本机生成Ragequit证明…");const runtime=await loadPrivacyRuntime(recovery.mnemonic,{allowRpcFallback:true}),notes=runtime.account.getSpendableCommitments().get(runtime.scope)||[];if(!notes.length)throw new Error("没有可紧急退出的承诺");const note=notes[0],proof=await privacyRuntime.sdk.proveCommitment(note.value,note.label,note.nullifier,note.secret),formatted=solidityProof(proof);askConfirm("确认紧急恢复",[["原存款钱包",account],["退回金额",`${E.formatEther(note.value)} OKB`],["去向","仅退回原存款钱包"],["说明",notes.length>1?`本次处理1笔，之后仍有${notes.length-1}笔`:`本次处理全部可见余额`]],()=>transact("shielded-ragequit-status","Ragequit紧急恢复",()=>new E.Contract(P3.pool,PRIVACY_POOL_ABI,signer).ragequit(formatted)))}catch(x){setMessage("shielded-ragequit-status",errText(x),"error")}finally{$("shielded-ragequit-password").value=""}});

  const receiptTemplates={
    "payment.confirmed":["TapeFlow X 付款成功","您的付款已确认。请核对订单号、币种、金额与交易哈希。"],
    "packet.ready":["您有一个 TapeFlow 红包待领取","红包已经创建，请通过官方领取链接核对编号并领取。"],
    "packet.claimed":["TapeFlow 红包已领取","红包已转入您指定的钱包或电路容器。"],
    "order.shipped":["订单已经发货","商户已完成发货，请通过订单号查询物流与售后状态。"],
    "escrow.released":["担保款已经释放","交付确认完成，担保资金已经按规则释放。"],
    "refund.completed":["退款已经完成","退款交易已确认，请核对收款地址和交易哈希。"],
    "crosschain.settled":["跨链支付已经结算","目标链付款已确认，源链支付意图已经结算。"]
  };
  $("receipt-template").onchange=e=>{const [subject,body]=receiptTemplates[e.target.value]||["TapeFlow X 业务通知",""];$("receipt-subject").value=subject;$("receipt-body").value=body};
  $("receipt-template").dispatchEvent(new Event("change"));
  $("receipt-form").addEventListener("submit",async e=>{e.preventDefault();try{
    if(!window.TapeFlowTapeSend)throw new Error("TapeSend加密模块没有加载");await ensureWallet();
    const reference=$("receipt-reference").value.trim(),ref=reference?hashText(reference):`0x${"0".repeat(64)}`;
    setMessage("receipt-status","正在通过多节点核验双方电路与加密公钥…");
    const prepared=await window.TapeFlowTapeSend.prepareReceipt({sender:$("receipt-sender").value,recipient:$("receipt-recipient").value,recipientChainId:Number($("receipt-recipient-chain").value),wallet:account,subject:$("receipt-subject").value,body:JSON.stringify({type:$("receipt-template").value,reference,body:$("receipt-body").value}),reference:ref,allowPublic:!$("receipt-sealed-only").checked});
    if(!prepared.sender.hub?.expectedImplementation)throw new Error("DeWEB Hub实现未通过客户端认可名单核对");
    setMessage("receipt-status",prepared.encrypted?"端点核验通过，正文已端到端加密；请在钱包确认Gas。":"收件方无公钥，将发送公开正文；请在钱包确认Gas。");
    const tx=await signer.sendTransaction(prepared.tx);setMessage("receipt-status",`消息已提交 ${short(tx.hash)}，等待确认…`);await tx.wait();
    setMessage("receipt-status",`加密履约消息已发送 · ${short(tx.hash)}`,"success");toast("履约消息已发送");
  }catch(x){setMessage("receipt-status",errText(x),"error")}});

  $("cross-form").addEventListener("submit",e=>{e.preventDefault();try{const token=selected("cross-source-token"),units=parseAmount($("cross-source-amount").value,token),chain=Number($("cross-chain").value),recipient=validAddress($("cross-recipient").value),dest=$("cross-destination-token").value?validAddress($("cross-destination-token").value):ZERO,min=E.parseUnits($("cross-min-out").value,18),deadline=formDeadline($("cross-duration").value);if(chain===196)throw new Error("目标链必须不同于X Layer");askConfirm("确认跨链支付意图",[["源链锁定",`${$("cross-source-amount").value} ${token.symbol}`],["目标链",String(chain)],["目标地址",recipient],["结算方式","Solver先付款，您核对后再释放源链资金"]],async()=>{const receipt=await transact("cross-status","创建跨链意图",async()=>{const c=intent();await approveIfNeeded(token,await c.getAddress(),units,"cross-status");return c.createIntent(token.address,units,chain,recipient,dest,min,deadline,token.address===ZERO?{value:units}:{})});const id=findIntentId(receipt);if(id){$("cross-intent-id").value=id;setMessage("cross-status",`跨链意图 #${id} 已创建，等待Solver报价。`,"success")}})}catch(e2){setMessage("cross-status",errText(e2),"error")}});
  $("cross-refund").onclick=async()=>{try{await transact("cross-manage-status","跨链意图退款",()=>intent().refund($("cross-intent-id").value))}catch{}};

  function findEventId(receipt,name,key){const iface=new E.Interface(HUB_ABI);for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name===name)return p.args[key].toString()}catch{}}}
  function findIntentId(receipt){const iface=new E.Interface(INTENT_ABI);for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name==="IntentCreated")return p.args.intentId.toString()}catch{}}}
  function findLockEventId(receipt){const iface=new E.Interface(LOCK_ABI);for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name==="LockCreated")return p.args.lockId.toString()}catch{}}}
  function b64urlJson(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
  function unb64(v){v=v.replace(/-/g,"+").replace(/_/g,"/");while(v.length%4)v+="=";const s=atob(v);return JSON.parse(new TextDecoder().decode(Uint8Array.from(s,c=>c.charCodeAt(0))))}
  function makeLink(kind,data){return `${location.origin}${location.pathname}#${kind}=${b64urlJson(data)}`}
  function qrData(text){const q=window.qrcode(0,"M");q.addData(text);q.make();return q.createDataURL(6,10)}
  function showQR(id,link,title,sub,copy){const n=$(id);n.classList.remove("empty");n.innerHTML=`<img src="${qrData(link)}" alt="QR"><h2>${title}</h2><p>${sub}</p><button class="ghost" type="button">${copy?"复制付款链接":"复制链接"}</button>`;n.querySelector("button").onclick=()=>navigator.clipboard.writeText(link).then(()=>toast("链接已复制"))}
  function showWalletConnect(){
    setMessage("wallet-connect-status","选择一种授权方式。跨设备扫码不会把 A 设备页面转移到 B 手机。","");
    $("wallet-dialog").showModal();
  }
  function showPacketShare(id,link,generation=activePacketGeneration){const code=packetCode(id,generation),n=$("packet-detail");n.insertAdjacentHTML("beforeend",`<img class="packet-qr" src="${qrData(link)}" alt="红包二维码"><button class="ghost" type="button">复制红包链接</button>`);n.querySelector("button").onclick=()=>navigator.clipboard.writeText(link).then(()=>toast(`${code} 链接已复制`))}
  async function encrypt(text,password){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]),key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt"]),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(text));return{alg:"AES-GCM/PBKDF2-210k",salt:E.hexlify(salt),iv:E.hexlify(iv),cipher:E.hexlify(new Uint8Array(cipher))}}

  function parseBudgetAmount(value,token,label){
    const text=String(value??"").trim();
    if(!text || text==="0")return 0n;
    if(!/^\d+(?:\.\d+)?$/.test(text))throw new Error(`${label}格式不正确`);
    const units=E.parseUnits(text,token.decimals);
    if(units>((1n<<128n)-1n))throw new Error(`${label}过大`);
    return units;
  }
  function budgetText(value,token){return value===0n?"不限额":`${formatAmount(value,token)} ${token.symbol}`}
  function renderBudgetFrozenAction(){
    const token=selected("budget-token"),button=$("budget-save-frozen"),loaded=budgetLoadedToken===token.address.toLowerCase()&&budgetLoadedFrozen!==null,desired=$("budget-frozen").checked;
    button.classList.remove("red-button","primary");
    if(!loaded){button.textContent="请先读取当前规则";button.disabled=true;return}
    if(desired===budgetLoadedFrozen){button.textContent=desired?`${token.symbol} 已冻结`:`${token.symbol} 付款已启用`;button.disabled=true;return}
    button.disabled=false;
    if(desired){button.textContent=`确认暂停 ${token.symbol} 付款`;button.classList.add("red-button")}
    else{button.textContent=`解除 ${token.symbol} 冻结`;button.classList.add("primary")}
  }
  async function loadBudgetGuard(){
    try{
      await ensureWallet();
      const token=selected("budget-token"),policy=budgetPolicy(false);
      const [budget,allowlist]=await Promise.all([policy.budgets(account,token.address),policy.usesAllowlist(account,token.address)]);
      const currentDay=BigInt(Math.floor(Date.now()/86400000));
      const spent=budget.day===currentDay?budget.spentToday:0n;
      $("budget-single").value=budget.singleLimit===0n?"0":formatAmount(budget.singleLimit,token);
      $("budget-daily").value=budget.dailyLimit===0n?"0":formatAmount(budget.dailyLimit,token);
      $("budget-use-allowlist").checked=allowlist;
      $("budget-frozen").checked=budget.frozen;
      budgetLoadedToken=token.address.toLowerCase();budgetLoadedFrozen=budget.frozen;renderBudgetFrozenAction();
      $("budget-current").innerHTML=`<small>当前规则 · ${escapeHtml(token.symbol)}</small><b>${budget.frozen?"已暂停付款":"付款已启用"}</b><span>单笔 ${escapeHtml(budgetText(budget.singleLimit,token))} · 每日 ${escapeHtml(budgetText(budget.dailyLimit,token))}<br>今日已用 ${escapeHtml(formatAmount(spent,token))} ${escapeHtml(token.symbol)} · 白名单${allowlist?"开启":"关闭"}</span>`;
      setMessage("budget-status","已读取链上规则。","success");
    }catch(e){setMessage("budget-status",errText(e),"error")}
  }
  function saveBudgetGuard(){
    try{
      const token=selected("budget-token"),single=parseBudgetAmount($("budget-single").value,token,"单笔限额"),daily=parseBudgetAmount($("budget-daily").value,token,"每日限额"),allowlist=$("budget-use-allowlist").checked;
      if(single>0n&&daily>0n&&single>daily)throw new Error("单笔限额不能高于每日限额");
      askConfirm("确认预算规则",[["币种",token.symbol],["单笔限额",budgetText(single,token)],["每日限额",budgetText(daily,token)],["收款白名单",allowlist?"开启":"关闭"],["今日累计","保存后从零重新计算"]],async()=>{await transact("budget-status","保存预算规则",()=>budgetPolicy().setBudget(token.address,single,daily,allowlist));await loadBudgetGuard()});
    }catch(e){setMessage("budget-status",errText(e),"error")}
  }
  function saveBudgetRecipient(){
    try{
      const token=selected("budget-token"),recipient=validAddress($("budget-recipient").value,"白名单地址"),allowed=$("budget-recipient-allowed").checked;
      askConfirm(allowed?"加入收款白名单":"移出收款白名单",[["币种",token.symbol],["完整地址",recipient],["操作",allowed?"允许收款":"禁止收款"]],async()=>{await transact("budget-status","保存白名单",()=>budgetPolicy().setRecipient(token.address,recipient,allowed));setMessage("budget-status",`白名单已更新：${short(recipient)}`,"success")});
    }catch(e){setMessage("budget-status",errText(e),"error")}
  }
  function saveBudgetFrozen(){
    try{
      const token=selected("budget-token"),frozen=$("budget-frozen").checked;
      if(budgetLoadedToken!==token.address.toLowerCase()||budgetLoadedFrozen===null)throw new Error("请先读取当前币种的链上规则");
      if(frozen===budgetLoadedFrozen)throw new Error(frozen?`${token.symbol} 已经处于冻结状态`:`${token.symbol} 付款已经启用`);
      askConfirm(frozen?"暂停这个币种的付款":"恢复这个币种的付款",[["币种",token.symbol],["当前钱包",account?short(account):"连接后确认"],["状态",frozen?"暂停 TapeFlow 付款":"允许 TapeFlow 付款"]],async()=>{await transact("budget-status",frozen?"暂停付款":"恢复付款",()=>budgetPolicy().setFrozen(token.address,frozen));await loadBudgetGuard()});
    }catch(e){setMessage("budget-status",errText(e),"error")}
  }
  $("open-budget-guard").onclick=()=>$("budget-guard").scrollIntoView({behavior:"smooth",block:"start"});
  $("budget-load").onclick=loadBudgetGuard;
  $("budget-save").onclick=saveBudgetGuard;
  $("budget-save-recipient").onclick=saveBudgetRecipient;
  $("budget-save-frozen").onclick=saveBudgetFrozen;
  $("budget-frozen").onchange=renderBudgetFrozenAction;
  $("budget-token").onchange=()=>{budgetLoadedToken="";budgetLoadedFrozen=null;renderBudgetFrozenAction();$("budget-current").innerHTML="<small>当前规则</small><b>等待读取</b><span>切换币种后请读取链上规则</span>";setMessage("budget-status","")};

  $("token-form").addEventListener("submit",async e=>{e.preventDefault();try{
    setMessage("token-status","正在读取 X Layer 代币信息…");
    const a=validAddress($("token-address").value,"代币合约"),c=new E.Contract(a,ERC20_ABI,readProvider());
    const [name,symbol,decimals]=await Promise.all([c.name(),c.symbol(),c.decimals()]);
    if(!symbol||Number(decimals)<0||Number(decimals)>255)throw new Error("代币元数据不正确");
    const token={address:a,name,symbol,decimals:Number(decimals)},existing=tokens.findIndex(t=>t.address.toLowerCase()===a.toLowerCase());
    if(existing>=0)tokens[existing]=token;else tokens.push(token);
    saveJSON(TOKEN_KEY,tokens.slice(1));renderTokens();
    const target=tokenTargetSelect||$("pay-token");target.value=a;target.dispatchEvent(new Event("input",{bubbles:true}));target.dispatchEvent(new Event("change",{bubbles:true}));
    $("token-dialog").close();toast(`${symbol} 已添加并选中`)
  }catch(e2){setMessage("token-status",errText(e2),"error")}});
  $("settings-form").addEventListener("submit",e=>{e.preventDefault();try{
    const addressKeys=["hub","escrow","packetV2","policy","circuitPolicy","intent","lock","priceOracle","processor"],urlKeys=["claimRelayer","oidcIssuer"],textKeys=["oidcClientId","oidcAudience"];
    for(const k of [...addressKeys,"circuit",...urlKeys,...textKeys]){const v=$(`setting-${k}`).value.trim();if(v&&addressKeys.includes(k)&&!E.isAddress(v))throw new Error(`${k}地址格式不正确`);if(v&&urlKeys.includes(k)&&!/^https:\/\//i.test(v)&&!/^http:\/\/127\.0\.0\.1(?::\d+)?/i.test(v))throw new Error(`${k}必须使用HTTPS`);settings[k]=v}
    const anyOidcSetting=Boolean(settings.oidcIssuer||settings.oidcClientId||settings.oidcAudience);
    if(anyOidcSetting&&(!settings.claimRelayer||!settings.oidcIssuer||!settings.oidcClientId||!settings.oidcAudience))throw new Error("启用免连接领取时，必须同时配置 Relayer、Issuer、Client ID 与 Audience");
    saveJSON(KEY,settings);renderSettings();loadDefaultArbiter();setMessage("settings-status","已保存为本机覆盖配置。","success")
  }catch(e2){setMessage("settings-status",errText(e2),"error")}});
  $("reset-settings").onclick=()=>{settings={...CFG.contracts,...(CFG.services||{})};saveJSON(KEY,settings);renderSettings();setMessage("settings-status","已恢复 X Layer 主网公开配置。","success")};
  $("oracle-authorize-signer").onclick=authorizePricePublisher;
  $("confirm-checkbox").onchange=e=>$("confirm-action").disabled=!e.target.checked;
  $("confirm-action").onclick=async()=>{
    if(!confirmAction)return;
    const action=confirmAction;
    confirmAction=null;
    $("confirm-action").disabled=true;
    $("confirm-dialog").close();
    $("confirm-checkbox").checked=false;
    try{await action()}catch{}
  };
  $$('[data-add-token]').forEach(n=>n.onclick=()=>{tokenTargetSelect=n.closest("label")?.querySelector("[data-token-select]")||$("pay-token");setMessage("token-status","");$("token-dialog").showModal()});$$('[data-close-dialog]').forEach(n=>n.onclick=()=>$(n.dataset.closeDialog).close());
  $$('[data-page-link]').forEach(n=>n.onclick=()=>navigate(n.dataset.pageLink));$$('[data-go]').forEach(n=>n.onclick=()=>navigate(n.dataset.go));
  $("wallet-button").onclick=()=>account?showWalletAccount():(window.ethereum?ensureWallet().catch(e=>toast(errText(e))):showWalletConnect());$("refresh-button").onclick=()=>refreshBalance().catch(e=>toast(errText(e)));
  $("wallet-account-dialog").addEventListener("close",()=>$("wallet-button").setAttribute("aria-expanded","false"));
  $("copy-wallet-address").onclick=async()=>{try{await navigator.clipboard.writeText(account);toast("钱包地址已复制")}catch{toast("复制失败，请手动复制地址")}};
  $("disconnect-wallet").onclick=disconnectWallet;
  $("wallet-connect-cross").onclick=()=>connectOkxWallet("cross");
  $("wallet-connect-local").onclick=()=>connectOkxWallet("local");
  function stopScanner(){if(scanStream){scanStream.getTracks().forEach(track=>track.stop());scanStream=null}const video=$("scan-video");video.pause();video.srcObject=null;video.style.display="none"}
  const openScanner=()=>{setMessage("scan-status","");$("scan-text").value="";$("scan-dialog").showModal()};
  $("scan-button").onclick=openScanner;
  $("home-scan-button").onclick=openScanner;
  $("parse-scan").onclick=()=>parseRequest($("scan-text").value);
  $("camera-scan").onclick=scanCamera;$("scan-file").onchange=scanImage;
  $("scan-dialog").addEventListener("close",stopScanner);
  $("copy-developer-wallet").onclick=async()=>{try{await navigator.clipboard.writeText($("developer-wallet").textContent);toast("开发者钱包地址已复制")}catch{toast("复制失败，请手动复制地址")}};
  $("copy-api-example").onclick=()=>navigator.clipboard.writeText(`window.TapeFlowX.createPayment({chainId:196,token:"native",recipient:"0x...",amount:"1.5",orderId:"ORDER-001"})`).then(()=>toast("示例已复制"));
  $("language-button").onclick=()=>{const next=document.documentElement.lang==="en"?"zh-CN":"en";setLanguage(next);toast(next==="en"?"Switched to English":"已切换中文")};
  function qrCanvas(source,width,height){
    const max=1100,scale=Math.min(1,max/Math.max(width,height)),canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext("2d",{willReadFrequently:true});context.drawImage(source,0,0,canvas.width,canvas.height);return{canvas,context};
  }
  function decodeQrCanvas(canvas,context){
    if(typeof window.jsQR!=="function")return "";
    const image=context.getImageData(0,0,canvas.width,canvas.height),result=window.jsQR(image.data,image.width,image.height,{inversionAttempts:"attemptBoth"});return result?.data||"";
  }
  async function decodeQrSource(source,width,height){
    if("BarcodeDetector" in window){try{const result=await new BarcodeDetector({formats:["qr_code"]}).detect(source);if(result[0]?.rawValue)return result[0].rawValue}catch{}}
    const {canvas,context}=qrCanvas(source,width,height);return decodeQrCanvas(canvas,context);
  }
  async function scanCamera(){
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("当前浏览器禁止网页调用摄像头，请从相册选择二维码图片或粘贴链接");
      stopScanner();scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});
      const video=$("scan-video");video.srcObject=scanStream;video.style.display="block";await video.play();setMessage("scan-status","请将二维码放入画面中；若钱包浏览器禁用摄像头，可从相册选择图片。","");
      let last=0,busy=false;
      const tick=async time=>{
        if(!scanStream)return;
        if(!busy&&video.readyState>=2&&time-last>180){busy=true;last=time;try{const value=await decodeQrSource(video,video.videoWidth,video.videoHeight);if(value){parseRequest(value);return}}catch(error){stopScanner();setMessage("scan-status",errText(error),"error");return}finally{busy=false}}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }catch(error){stopScanner();setMessage("scan-status",`${errText(error)}。也可以从相册选择二维码图片或粘贴链接。`,"error")}
  }
  async function scanImage(event){
    const file=event.target.files?.[0];
    try{
      if(!file)return;
      setMessage("scan-status","正在识别二维码图片…","");
      const url=URL.createObjectURL(file),image=new Image();
      try{
        await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("图片读取失败"));image.src=url});
        const value=await decodeQrSource(image,image.naturalWidth,image.naturalHeight);if(!value)throw new Error("图片中没有识别到二维码，请选择清晰、完整的原图");parseRequest(value);
      }finally{URL.revokeObjectURL(url)}
    }catch(error){setMessage("scan-status",errText(error),"error")}finally{event.target.value=""}
  }
  function parsedTapeFlowLink(link){
    const raw=String(link??"").trim();if(!raw)throw new Error("请扫描二维码或粘贴 TapeFlow 链接");let hash=raw;
    if(/^[a-z][a-z0-9+.-]*:/i.test(raw)){const url=new URL(raw),host=url.hostname.toLowerCase(),trusted=url.origin===location.origin||host==="tapeflow.world"||host.endsWith(".tapeflow.world")||host==="tapeflow.katiemia543789.chatgpt.site";if(url.protocol!=="https:"&&!trusted)throw new Error("只支持安全的 TapeFlow 链接");if(!trusted)throw new Error("这不是 TapeFlow 官方二维码");hash=url.hash}
    hash=hash.replace(/^.*#/,"").replace(/^#/,"");const split=hash.indexOf("=");if(split<1)throw new Error("二维码内容不完整");const kind=hash.slice(0,split),data=unb64(hash.slice(split+1));return{kind,data}
  }
  function parseRequest(link){try{
    const {kind,data}=parsedTapeFlowLink(link);if(data.chainId!==undefined&&Number(data.chainId)!==CFG.chainId)throw new Error("这个二维码不属于 X Layer");
    if(kind==="request"){const recipient=validAddress(data.recipient,"收款地址"),amount=String(data.amount??"");if(!/^\d+(?:\.\d+)?$/.test(amount)||Number(amount)<=0)throw new Error("付款金额格式不正确");const tokenAddress=validAddress(data.token,"付款币种");stopScanner();$("scan-dialog").close();navigate("pay");$("pay-recipient").value=recipient;$("pay-amount").value=amount;$("pay-memo").value=String(data.memo||"");if(tokens.some(t=>t.address.toLowerCase()===tokenAddress.toLowerCase()))$("pay-token").value=tokenBy(tokenAddress).address;toast("付款信息已填好，请核对")}
    else if(kind==="packet"){const id=BigInt(data.id).toString(),generation=data.hub==="v4"?"v4":"v3",code=packetCode(id,generation);activePacketGeneration=generation;stopScanner();$("scan-dialog").close();navigate("packet");$("packet-id").value=code;setMessage("claim-status","");loadPacket()}
    else if(kind==="lock"){const id=BigInt(data.id).toString();stopScanner();$("scan-dialog").close();navigate("lock");$("lock-id").value=id;loadLock()}
    else throw new Error("这类 TapeFlow 二维码暂不支持")
  }catch(e){setMessage("scan-status",errText(e),"error")}}

  window.TapeFlowX={
    createPayment({token="native",recipient,amount,orderId=""}){const t=token==="native"?ZERO:validAddress(token);return makeLink("request",{v:1,chainId:196,token:t,recipient:validAddress(recipient),amount:String(amount),memo:orderId})},
    openPayment(options){location.href=this.createPayment(options)},
    version:CFG.version
  };
  if(window.ethereum){window.ethereum.on?.("accountsChanged",accounts=>handleWalletAccountsChanged(accounts,window.ethereum));window.ethereum.on?.("chainChanged",()=>{if(activeWalletProvider===window.ethereum)location.reload()})}
  await restoreConnectedWallet().catch(()=>{});
  try{await handleOidcCallback()}catch(e){setMessage("claim-status",errText(e),"error");history.replaceState(null,"",`${location.pathname}#packet`)}
  await loadRelayerCapabilities();
  renderTokens();renderSettings();loadDefaultArbiter();packetUI("equal");lockUI();updateEscrowTotal();checkPrivacyHealth().catch(()=>{});
  const hash=location.hash.slice(1);if(hash.startsWith("request=")||hash.startsWith("packet=")||hash.startsWith("lock="))parseRequest(`#${hash}`);else navigate(titleMap[hash]?hash:"home");
  setLanguage(localStorage.getItem("tapeflow-x-lang")==="en"?"en":"zh-CN");
  setTimeout(()=>$("splash").classList.add("hide"),850);
})();
