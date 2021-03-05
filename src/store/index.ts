import Vue from "vue";
import Vuex from "vuex";
import { BeaconWallet } from "@taquito/beacon-wallet";
// import { getCurrentPermission, onAvailabilityChange } from "@temple-wallet/dapp";
import { QSAsset, getTokens, getNetwork, LOGO_URL } from "@/core";
import { TezosToolkit } from "@taquito/taquito";

Vue.use(Vuex);

interface StoreState {
  tokensLoading: boolean;
  tokens: QSAsset[];
  account: { pkh: string };
}

const store = new Vuex.Store<StoreState>({
  state: {
    tokensLoading: false,
    tokens: [],
    account: getAccountInitial(),
  },
  mutations: {
    tokensLoading(state, tokensLoading) {
      state.tokensLoading = tokensLoading;
    },
    tokens(state, tokens) {
      state.tokens = tokens;
    },
    account(state, account) {
      state.account = account;
    },
  },
});

export default store;

loadTokens();

export async function loadTokens() {
  try {
    store.commit("tokensLoading", true);
    store.commit("tokens", await getTokens());
  } catch (err) {
    console.error(err);
  } finally {
    store.commit("tokensLoading", false);
  }
}

const wallet = new BeaconWallet({
  name: "Quipuswap",
  iconUrl: LOGO_URL,
  // eventHandlers: {
  //   PERMISSION_REQUEST_SUCCESS: {
  //     handler: async data => {
  //       console.log("permission data:", data);
  //     },
  //   },
  // },
});

// setTimeout(async () => {
//   try {
//     if (await isAvailable()) {
//       const p = await getCurrentPermission();
//       if (!p) {
//         await wallet.disconnect();
//       }
//     }
//   } catch {}

//   console.info("DONE");
// }, 1000);

// let templeAvailable = false;
// onAvailabilityChange((available) => {
//   templeAvailable = available;
// });

export async function useWallet(opts = { forcePermission: false }) {
  const net = getNetwork();

  const beaconCheck = localStorage.getItem("beacon_seed_check");
  if (
    beaconCheck &&
    beaconCheck !== localStorage.getItem("beacon:sdk-secret-seed")
  ) {
    await wallet.disconnect();
    await wallet.clearActiveAccount();
  }

  const activeAccount = await wallet.client.getActiveAccount();
  if (opts.forcePermission || !activeAccount) {
    if (activeAccount) {
      await wallet.clearActiveAccount();
    }
    await wallet.requestPermissions({
      network: { type: toBeaconNetworkType(net.id) },
    });
    localStorage.setItem(
      "beacon_seed_check",
      localStorage.getItem("beacon:sdk-secret-seed")!
    );
  }

  const tezos = new TezosToolkit(net.rpcBaseURL);
  tezos.setWalletProvider(wallet);
  tezos.setSignerProvider({
    async publicKeyHash() {
      const acc = await wallet.client.getActiveAccount();
      if (!acc) throw new Error("Not connected");
      return acc.address;
    },
    async publicKey() {
      const acc = await wallet.client.getActiveAccount();
      if (!acc) throw new Error("Not connected");
      return acc.publicKey;
    },
    async secretKey(): Promise<string> {
      throw new Error("Secret key cannot be exposed");
    },
    async sign() {
      throw new Error("Cannot sign");
    },
  });
  const pkh = await wallet.getPKH();

  if (getAccount().pkh !== pkh) {
    setAccount(pkh);
  }
  return tezos;
}

export function getAccount() {
  return store.state.account;
}

export function setAccount(pkh: string) {
  localStorage.setItem("accpkh", pkh);
  store.commit("account", { pkh });
}

export function signout() {
  localStorage.removeItem("accpkh");
  store.commit("account", { pkh: "" });
}

function getAccountInitial() {
  const pkh = localStorage.getItem("accpkh");
  return { pkh: pkh || "" };
}

function toBeaconNetworkType(netId: string): any {
  return netId === "edo2net" ? "edonet" : netId;
}
