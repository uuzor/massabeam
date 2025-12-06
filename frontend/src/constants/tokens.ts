import { BUILDNET_TOKENS } from "@massalabs/massa-web3";

export interface TokenOption {
  symbol: string;
  address: string;
  name: string;
}

const buildnetTokenOptions: TokenOption[] = Object.entries(BUILDNET_TOKENS).map(
  ([symbol, address]) => ({
    symbol,
    address,
    name: symbol,
  })
);

export const NATIVE_MAS: TokenOption = {
  symbol: "MAS",
  address: "NATIVE_MAS",
  name: "MAS",
};

export const TOKEN_OPTIONS: TokenOption[] = [
  NATIVE_MAS,
  ...buildnetTokenOptions,
];
