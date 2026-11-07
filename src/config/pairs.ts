/**
 * Trading pairs tracked by the dashboard.
 * To add a pair, append an entry — the symbol must exist on Binance spot.
 */
export interface TradingPair {
  symbol: string;
  base: string;
  quote: string;
  name: string;
}

export const PAIRS: TradingPair[] = [
  // Top 50 by market cap (CoinGecko, Nov 2026) that trade vs USDT on Binance.
  // Stablecoins and wrapped/staked tokens are excluded. "#n" = market-cap rank.
  { symbol: "BTCUSDT", base: "BTC", quote: "USDT", name: "Bitcoin" }, // #1
  { symbol: "ETHUSDT", base: "ETH", quote: "USDT", name: "Ethereum" }, // #2
  { symbol: "BNBUSDT", base: "BNB", quote: "USDT", name: "BNB" }, // #4
  { symbol: "XRPUSDT", base: "XRP", quote: "USDT", name: "XRP" }, // #5
  { symbol: "SOLUSDT", base: "SOL", quote: "USDT", name: "Solana" }, // #7
  { symbol: "TRXUSDT", base: "TRX", quote: "USDT", name: "TRON" }, // #8
  { symbol: "ZECUSDT", base: "ZEC", quote: "USDT", name: "Zcash" }, // #10
  { symbol: "HYPEUSDT", base: "HYPE", quote: "USDT", name: "Hyperliquid" }, // #11
  { symbol: "DOGEUSDT", base: "DOGE", quote: "USDT", name: "Dogecoin" }, // #13
  { symbol: "LINKUSDT", base: "LINK", quote: "USDT", name: "Chainlink" }, // #17
  { symbol: "ADAUSDT", base: "ADA", quote: "USDT", name: "Cardano" }, // #18
  { symbol: "XLMUSDT", base: "XLM", quote: "USDT", name: "Stellar" }, // #19
  { symbol: "BCHUSDT", base: "BCH", quote: "USDT", name: "Bitcoin Cash" }, // #20
  { symbol: "NEARUSDT", base: "NEAR", quote: "USDT", name: "NEAR Protocol" }, // #21
  { symbol: "UNIUSDT", base: "UNI", quote: "USDT", name: "Uniswap" }, // #25
  { symbol: "LTCUSDT", base: "LTC", quote: "USDT", name: "Litecoin" }, // #26
  { symbol: "AVAXUSDT", base: "AVAX", quote: "USDT", name: "Avalanche" }, // #28
  { symbol: "SUIUSDT", base: "SUI", quote: "USDT", name: "Sui" }, // #29
  { symbol: "GRAMUSDT", base: "GRAM", quote: "USDT", name: "Gram (prev. Toncoin)" }, // #32
  { symbol: "HBARUSDT", base: "HBAR", quote: "USDT", name: "Hedera" }, // #33
  { symbol: "QNTUSDT", base: "QNT", quote: "USDT", name: "Quant" }, // #34
  { symbol: "SHIBUSDT", base: "SHIB", quote: "USDT", name: "Shiba Inu" }, // #38
  { symbol: "TAOUSDT", base: "TAO", quote: "USDT", name: "Bittensor" }, // #39
  { symbol: "ENAUSDT", base: "ENA", quote: "USDT", name: "Ethena" }, // #42
  { symbol: "PEPEUSDT", base: "PEPE", quote: "USDT", name: "Pepe" }, // #45
  { symbol: "AAVEUSDT", base: "AAVE", quote: "USDT", name: "Aave" }, // #46
  { symbol: "ONDOUSDT", base: "ONDO", quote: "USDT", name: "Ondo" }, // #52
  { symbol: "PUMPUSDT", base: "PUMP", quote: "USDT", name: "Pump.fun" }, // #53
  { symbol: "ASTERUSDT", base: "ASTER", quote: "USDT", name: "Aster" }, // #55
  { symbol: "DOTUSDT", base: "DOT", quote: "USDT", name: "Polkadot" }, // #57
  { symbol: "MORPHOUSDT", base: "MORPHO", quote: "USDT", name: "Morpho" }, // #60
  { symbol: "WLFIUSDT", base: "WLFI", quote: "USDT", name: "World Liberty Financial" }, // #62
  { symbol: "ICPUSDT", base: "ICP", quote: "USDT", name: "Internet Computer" }, // #64
  { symbol: "WLDUSDT", base: "WLD", quote: "USDT", name: "Worldcoin" }, // #66
  { symbol: "JSTUSDT", base: "JST", quote: "USDT", name: "JUST" }, // #68
  { symbol: "ARBUSDT", base: "ARB", quote: "USDT", name: "Arbitrum" }, // #69
  { symbol: "ETCUSDT", base: "ETC", quote: "USDT", name: "Ethereum Classic" }, // #71
  { symbol: "POLUSDT", base: "POL", quote: "USDT", name: "POL (ex-MATIC)" }, // #75
  { symbol: "ALGOUSDT", base: "ALGO", quote: "USDT", name: "Algorand" }, // #77
  { symbol: "RENDERUSDT", base: "RENDER", quote: "USDT", name: "Render" }, // #79
  { symbol: "INJUSDT", base: "INJ", quote: "USDT", name: "Injective" }, // #80
  { symbol: "JUPUSDT", base: "JUP", quote: "USDT", name: "Jupiter" }, // #83
  { symbol: "ATOMUSDT", base: "ATOM", quote: "USDT", name: "Cosmos Hub" }, // #84
  { symbol: "FILUSDT", base: "FIL", quote: "USDT", name: "Filecoin" }, // #87
  { symbol: "ZROUSDT", base: "ZRO", quote: "USDT", name: "LayerZero" }, // #89
  { symbol: "STXUSDT", base: "STX", quote: "USDT", name: "Stacks" }, // #90
  { symbol: "NIGHTUSDT", base: "NIGHT", quote: "USDT", name: "Midnight" }, // #91
  { symbol: "CAKEUSDT", base: "CAKE", quote: "USDT", name: "PancakeSwap" }, // #93
  { symbol: "DASHUSDT", base: "DASH", quote: "USDT", name: "Dash" }, // #95
  { symbol: "ETHFIUSDT", base: "ETHFI", quote: "USDT", name: "Ether.fi" }, // #96
];

export function findPair(symbol: string): TradingPair | undefined {
  return PAIRS.find((p) => p.symbol === symbol.toUpperCase());
}
