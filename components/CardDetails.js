import Web3 from "web3";
import React, { useState, useEffect } from "react";
import { useToasts } from "react-toast-notifications";
import Link from "next/link";
import AssetCard from "./Card";
import { getBlockchain } from "../webaverse/blockchain.js";
import {
  resubmitAsset,
  getStuckAsset,
  addNftCollaborator,
  removeNftCollaborator,
  setAssetName,
  deleteAsset,
  setLoadoutState,
  clearLoadoutState,
  setAvatar,
  setHomespace,
  withdrawAsset,
  depositAsset,
  cancelSale,
  sellAsset,
  buyAsset,
} from "../functions/AssetFunctions.js";
import { isTokenOnMain, getStores } from "../functions/UIStateFunctions.js";
import Loader from "./Loader";
import bip39 from "../libs/bip39.js";
import hdkeySpec from "../libs/hdkey.js";
const hdkey = hdkeySpec.default;
import wbn from '../wbn.js';

const m = "Proof of address.";
const _getUrlForHashExt = (hash, name, ext) => `https://ipfs.exokit.org/ipfs/${hash}/${name}.${ext}`;

const FileBrowser = ({
  name,
  hash,
  ext,
  closeBrowser,
}) => {
  const [files, setFiles] = useState([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  
  const u = _getUrlForHashExt(hash, name, ext);
  
  const isWbn = ext === 'wbn';
  if (isWbn && !filesLoaded) {
    (async () => {
      // console.log('got url', u);
      const res = await fetch(u);
      const arrayBuffer = await res.arrayBuffer();
      // debugger;
      // console.log('got arraybuffer', arrayBuffer);

      const fs = [];
      const bundle = new wbn.Bundle(arrayBuffer);
      const {urls} = bundle;

      for (const u of urls) {
        const response = bundle.getResponse(u);
        const {headers} = response;
        const contentType = headers['content-type'] || 'application/octet-stream';
        const b = new Blob([response.body], {
          type: contentType,
        });
        const blobUrl = URL.createObjectURL(b);
        const {pathname} = new URL(u);
        fs.push({
          pathname,
          blobUrl,
        });
      }
      
      setFiles(fs);
    })();
    setFilesLoaded(true);
  }
  
  return (
    <div className="fileBrowser">
      <div className="background" onClick={closeBrowser} />
      <div className="wrap">
        <ul>
          {isWbn ? files.map((f, i) => (
            <li>
             <a href={f.blobUrl} key={i}>{f.pathname}</a>
            </li>
          )) : <li>
             <a href={u}>{name}.{ext}</a>
            </li>
          }
        </ul>
      </div>
    </div>
  );
};

const CardDetails = ({
  id,
  name,
  description,
  image,
  hash,
  animation_url,
  ext,
  unlockable,
  totalInEdition,
  numberInEdition,
  totalSupply,
  balance,
  ownerAvatarPreview,
  ownerUsername,
  ownerAddress,
  minterAvatarPreview,
  minterAddress,
  minterUsername,
  isMainnet,
  buyPrice,
  storeId,
  globalState,
  assetType,
  getData,
}) => {
  const { addToast } = useToasts();

  const [toggleViewOpen, setToggleViewOpen] = useState(true);
  const [toggleEditOpen, setToggleEditOpen] = useState(false);
  const [toggleAddOpen, setToggleAddOpen] = useState(false);
  const [toggleTradeOpen, setToggleTradeOpen] = useState(false);
  const [unlock, setUnlock] = useState(null);

  const [loading, setLoading] = useState(false);
  const [imageView, setImageView] = useState("2d");
  const [tryOn, setTryOn] = useState(false);
  const [tokenOnMain, setTokenOnMain] = useState(false);
  const [mainnetAddress, setMainnetAddress] = useState(null);
  const [otherNetworkName, setOtherNetworkName] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [stuck, setStuck] = useState(false);
  const [unlockableSpec, setUnlockableSpec] = useState(null);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);

  useEffect(() => {
    if (globalState.loginToken) {
      getOtherData();
      getData();
    }
  }, [globalState]);

  const getOtherData = () => {
    (async () => {
      const isStuck = await getStuckAsset("NFT", id, globalState);
      if (isStuck) {
        setStuck(true);
      }
    })();
    (async () => {
      const tokenOnMain = await isTokenOnMain(id);
      setTokenOnMain(tokenOnMain);
    })();
    (async () => {
      const { web3, getOtherNetworkName, contracts } = await getBlockchain();
      setWeb3(web3);
      setOtherNetworkName(getOtherNetworkName());
      setContracts(contracts);
    })();
  };

  let userOwnsThisAsset, userCreatedThisAsset;
  if (globalState && globalState.address && isMainnet) {
    userOwnsThisAsset = false;
    userCreatedThisAsset =
      minterAddress.toLowerCase() === globalState.address.toLowerCase();
  } else if (globalState && globalState.address) {
    userOwnsThisAsset =
      ownerAddress.toLowerCase() === globalState.address.toLowerCase();
    userCreatedThisAsset =
      minterAddress.toLowerCase() === globalState.address.toLowerCase();
  } else {
    userOwnsThisAsset = false;
    userCreatedThisAsset = false;
  }

  let is3d = false;
  if (ext.toLowerCase() === "vrm" || ext.toLowerCase() === "glb") {
    is3d = true;
  }

  const isForSale =
    buyPrice !== undefined && buyPrice !== null && buyPrice !== "";

  const ethEnabled = async () => {
    if (window.ethereum) {
      window.ethereum.enable();
      window.mainWeb3 = new Web3(window.ethereum);
      const network = await window.mainWeb3.eth.net.getNetworkType();
      if (network === "main") {
        return true;
      } else {
        handleError("You need to be on the Mainnet network.");
        return false;
      }
    }
    handleError("Please install MetaMask to use Webaverse!");
    return false;
  };

  const loginWithMetaMask = async (func) => {
    const enabled = await ethEnabled();
    if (!enabled) {
      return false;
    } else {
      const web3 = window.mainWeb3;
      try {
        const eth = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (eth && eth[0]) {
          setMainnetAddress(eth[0]);
          return eth[0];
        } else {
          ethereum.on("accountsChanged", (accounts) => {
            setMainnetAddress(accounts[0]);
            func();
          });
          return false;
        }
      } catch (err) {
        handleError(err);
      }
    }
  };

  const handleSuccess = (msg, link) => {
    if (typeof msg === "object") {
      msg = JSON.stringify(msg);
    }
    addToast("Success!", {
      link: link,
      appearance: "success",
      autoDismiss: true,
    });
    getData();
    getOtherData();
    setLoading(false);
  };
  const handleError = (err) => {
    addToast("Error: " + err, { appearance: "error", autoDismiss: true });
    getData();
    getOtherData();
    setLoading(false);
  };

  const handleSetAssetName = (e) => {
    e.preventDefault();
    const name = prompt("What would you like to name this asset?", "");
    addToast("Setting item name to: " + name, {
      appearance: "info",
      autoDismiss: true,
    });
    setAssetName(name, hash, globalState, handleSuccess, handleError);
  };

  const handleSetAvatar = (e) => {
    e.preventDefault();
    addToast("Setting avatar to this item", {
      appearance: "info",
      autoDismiss: true,
    });
    setAvatar(id, globalState, handleSuccess, handleError);
  };

  const handleSetHomespace = (e) => {
    e.preventDefault();
    addToast("Setting homespace to this item", {
      appearance: "info",
      autoDismiss: true,
    });
    setHomespace(id, globalState, handleSuccess, handleError);
  };

  const clearLoadout = async (e) => {
    e.preventDefault();
    const loadoutNum = prompt("What loadout number do you want to clear?", "");
    addToast("Clearing loadout number: " + loadoutNum, {
      appearance: "info",
      autoDismiss: true,
    });
    await clearLoadoutState(
      loadoutNum,
      globalState,
      handleSuccess,
      handleError
    );
  };

  const addToLoadout = async (e) => {
    e.preventDefault();
    const loadoutNum = prompt(
      "What loadout number do you want to add this to?",
      "1"
    );
    addToast("Setting this item to loadout number " + loadoutNum, {
      appearance: "info",
      autoDismiss: true,
    });
    await setLoadoutState(
      id,
      loadoutNum,
      globalState,
      handleSuccess,
      handleError
    );
  };

  const handleBuyAsset = (e) => {
    e.preventDefault();
    var r = confirm("You are about to buy this, are you sure?");
    if (r == true) {
      addToast("Buying this item...", {
        appearance: "info",
        autoDismiss: true,
      });
      buyAsset(
        storeId,
        "sidechain",
        globalState.loginToken.mnemonic,
        handleSuccess,
        handleError
      );
    } else {
      handleError("canceled delete");
    }
  };

  const handleDeleteAsset = (e) => {
    e.preventDefault();
    var r = confirm(
      "You are about to permanently burn this item, are you sure?"
    );
    if (r == true) {
      addToast("Burning this item...", {
        appearance: "info",
        autoDismiss: true,
      });
      deleteAsset(
        id,
        globalState.loginToken.mnemonic,
        handleSuccess,
        handleError
      );
    } else {
      handleError("Canceled burn.");
    }
  };

  const handleSellAsset = (e) => {
    e.preventDefault();
    const sellPrice = prompt("How much would you like to sell this for?", "10");
    addToast("Selling this item for " + sellPrice + " SILK.", {
      appearance: "info",
      autoDismiss: true,
    });
    sellAsset(
      id,
      sellPrice,
      "sidechain",
      globalState.loginToken.mnemonic,
      handleSuccess,
      handleError
    );
  };

  const handleWithdraw = async (e) => {
    if (e) {
      e.preventDefault();
    }

    try {
      const mainnetAddress = await loginWithMetaMask(handleWithdraw);
      if (mainnetAddress) {
        addToast("Starting transfer of this item.", {
          appearance: "info",
          autoDismiss: true,
        });
        await withdrawAsset(
          id,
          mainnetAddress,
          globalState.address,
          globalState,
          handleSuccess,
          handleError
        );
      } else {
        handleError("No address received from MetaMask.");
      }
    } catch (err) {
      handleError(err.toString());
    }
  };

  const handleDeposit = async (e) => {
    if (e) {
      e.preventDefault();
    }

    try {
      const mainnetAddress = await loginWithMetaMask(handleDeposit);
      if (mainnetAddress) {
        addToast("Starting transfer of this item.", {
          appearance: "info",
          autoDismiss: true,
        });
        await depositAsset(
          id,
          "webaverse",
          mainnetAddress,
          globalState.address,
          globalState,
          handleSuccess,
          handleError
        );
      } else {
        handleError("No address received from MetaMask.");
      }
    } catch (err) {
      handleError(err.toString());
    }
  };

  const handleAddCollaborator = () => {
    const address = prompt(
      "What is the address of the collaborator to add?",
      "0x0"
    );

    if (address) {
      addToast("Adding collaborator: " + address, {
        appearance: "info",
        autoDismiss: true,
      });
      addNftCollaborator(
        hash,
        address,
        handleSuccess,
        handleError,
        globalState
      );
    } else handleError("No address given.");
  };

  const handleRemoveCollaborator = () => {
    const address = prompt(
      "What is the address of the collaborator to remove?",
      "0x0"
    );

    if (address) {
      addToast("Removing collaborator: " + address, {
        appearance: "info",
        autoDismiss: true,
      });
      removeNftCollaborator(
        hash,
        address,
        handleSuccess,
        handleError,
        globalState
      );
      setLoading(true);
    } else handleError("No address given.");
  };
  const _unlock = async () => {
    // const ethereumSpec = await window.ethereum.enable();
    // const [address] = ethereumSpec;

    const mainnetAddress = web3.front.currentProvider.selectedAddress;
    const {
      address: sidechainAddress,
      loginToken: { mnemonic },
    } = globalState;

    /* const _getMainnetTokens = async address => {
        const res = await fetch(`https://mainnet-tokens.webaverse.com/${address}`);
        const j = await res.json();
        return j;
      };
      // const tokens = await _getMainnetTokens('0x84310641ea558c5e2f86bfe4f95d426d4f3c7360');
      // console.log('got tokens', tokens);      
      const _getSidechainTokens = async address => {
        const res = await fetch(`https://tokens.webaverse.com/${address}`);
        const j = await res.json();
        return j;
      }; */
    const _getMainnetSignature = async () => {
      // const result1 = await window.ethereum.enable();
      await window.ethereum.enable();
      const signature = await web3.front.eth.personal.sign(
        m,
        web3.front.currentProvider.selectedAddress
      );
      const result3 = await web3.front.eth.personal.ecRecover(m, signature);
      // console.log('got sig 1', {signature});
      return signature;
    };
    const _getSidechainSignature = async () => {
      const wallet = hdkey
        .fromMasterSeed(bip39.mnemonicToSeedSync(mnemonic))
        .derivePath(`m/44'/60'/0'/0/0`)
        .getWallet();
      const privateKey = wallet.getPrivateKey().toString("hex");

      const result2 = await web3.back.eth.accounts.sign(m, privateKey);
      const { v, r, s, signature } = result2;
      const result3 = await web3.back.eth.accounts.recover(m, v, r, s);
      // console.log('got sig 2', {signature});
      return signature;
    };
    const _getUnlockable = async (signatures, id) => {
      const res = await fetch("https://unlock.exokit.org/", {
        method: "POST",
        body: JSON.stringify({
          signatures,
          id,
        }),
      });
      const j = await res.json();
      return j;
    };

    const [mainnetSignature, sidechainSignature] = await Promise.all([
      _getMainnetSignature(),
      _getSidechainSignature(),
    ]);
    const spec = await _getUnlockable(
      [mainnetSignature, sidechainSignature],
      id
    );
    // console.log('get all tokens', spec);
    setUnlockableSpec(spec);

    /* unlocksEl.innerHTML = allTokens.map(t => `<li class=token>
        ${t.id} - ${t.properties.hash} - ${t.properties.name} - ${t.properties.ext} - ${t.properties.unlockable} = ${t.unlocked}
      </li>`).join('\n'); */
    // console.log('got results', results);
  };
  const _openFileBrowser = () => {
    setFileBrowserOpen(true);
  };

  return (
    <>
      {tryOn ? (
        <>
          <a className="button" onClick={() => setTryOn(false)}>
            Go back
          </a>
          <div className="IFrameContainer">
            <iframe
              className="IFrame"
              src={"https://app.webaverse.com/?t=" + id}
            />
          </div>
        </>
      ) : (
        <>
          <div className="assetDetails">
            {loading ? (
              <Loader loading={loading} />
            ) : (
              <div className="assetDetailsContent">
                <div className="assetDetailsLeftColumn">
                  <AssetCard
                    id={id}
                    key={id}
                    assetName={name}
                    ext={ext}
                    animation_url={animation_url}
                    description={description}
                    buyPrice={buyPrice}
                    image={image}
                    hash={hash}
                    numberInEdition={numberInEdition}
                    totalSupply={totalSupply}
                    balance={balance}
                    totalInEdition={totalInEdition}
                    assetType={assetType}
                    ownerAvatarPreview={ownerAvatarPreview}
                    ownerUsername={ownerUsername}
                    ownerAddress={ownerAddress}
                    minterAvatarPreview={minterAvatarPreview}
                    minterUsername={minterUsername}
                    minterAddress={minterAddress}
                    cardSize={""}
                    networkType="webaverse"
                    glow={false}
                    imageView={imageView}
                  />
                </div>
                <div className="assetDetailsRightColumn">
                  <div className="assetDetailsOwnedBy">
                    <span className={`creatorIcon creatorIcon tooltip`}>
                      <img
                        src={ownerAvatarPreview.replace(/\.[^.]*$/, ".png")}
                      />
                      <span className={`creatorName creatorName tooltiptext`}>
                        {ownerUsername}
                      </span>
                    </span>{" "}
                    Owned by{" "}
                    <Link href={`/accounts/` + ownerAddress}>
                      {ownerUsername}
                    </Link>
                  </div>
                  <div className={`detailsBlock detailsBlockSet noselect`}>
                    <div className="Accordion">
                      <div
                        className="accordionTitle"
                        onClick={() => setToggleViewOpen(!toggleViewOpen)}
                      >
                        <span className="accordionTitleValue">View</span>
                        <span
                          className={`accordionIcon ${
                            toggleViewOpen ? "reverse" : ""
                          }`}
                        ></span>
                      </div>
                      {toggleViewOpen && (
                        <div className="accordionDropdown">
                          {[
                            is3d && imageView != "3d" && (
                              <button
                                className="assetDetailsButton"
                                onClick={() => setImageView("3d")}
                              >
                                See in 3d
                              </button>
                            ),
                            is3d && imageView != "2d" && (
                              <button
                                className="assetDetailsButton"
                                onClick={() => setImageView("2d")}
                              >
                                See in 2d
                              </button>
                            ),
                            <Link href={"/preview/" + id}>
                              <button className="assetDetailsButton">
                                Try in Webaverse
                              </button>
                            </Link>,
                            unlockableSpec ? (
                              <div className="assetDetailsButton">
                                {unlockableSpec.ok
                                  ? (unlockableSpec.result || '[no unlockable]')
                                  : "Could not unlock :("}
                              </div>
                            ) : (
                              <button
                                className="assetDetailsButton"
                                onClick={_unlock}
                              >
                                Unlock content
                              </button>
                            ),
                            <button
                              className="assetDetailsButton"
                              onClick={_openFileBrowser}
                            >
                              File browser
                            </button>
                          ]}
                        </div>
                      )}
                    </div>
                    {userOwnsThisAsset && (
                      <div className="Accordion">
                        <div
                          className="accordionTitle"
                          onClick={() => setToggleEditOpen(!toggleEditOpen)}
                        >
                          <span className="accordionTitleValue">Edit</span>
                          <span
                            className={`accordionIcon ${
                              toggleEditOpen ? "reverse" : ""
                            }`}
                          ></span>
                        </div>
                        {toggleEditOpen && (
                          <div className="accordionDropdown">
                            {[
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleSetAssetName}
                                >
                                  Change Asset Name
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleDeleteAsset}
                                >
                                  Burn This Item
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleAddCollaborator}
                                >
                                  Add Collaborator
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleRemoveCollaborator}
                                >
                                  Remove Collaborator
                                </button>
                              ),
                            ]}
                          </div>
                        )}
                      </div>
                    )}
                    {userOwnsThisAsset && (
                      <div className="Accordion">
                        <div
                          className="accordionTitle"
                          onClick={() => setToggleAddOpen(!toggleAddOpen)}
                        >
                          <span className="accordionTitleValue">Add</span>
                          <span
                            className={`accordionIcon ${
                              toggleAddOpen ? "reverse" : ""
                            }`}
                          ></span>
                        </div>
                        {toggleAddOpen && (
                          <div className="accordionDropdown">
                            {[
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleSetAvatar}
                                >
                                  Set As Avatar
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleSetHomespace}
                                >
                                  Set As Homespace
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={addToLoadout}
                                >
                                  Add To Loadout
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={clearLoadout}
                                >
                                  Clear From Loadout
                                </button>
                              ),
                            ]}
                          </div>
                        )}
                      </div>
                    )}
                    {(stuck || userOwnsThisAsset || tokenOnMain) && (
                      <div className="Accordion">
                        <div
                          className="accordionTitle"
                          onClick={() =>
                            setToggleTradeOpen(!toggleTradeOpen)
                          }
                        >
                          <span className="accordionTitleValue">Trade</span>
                          <span
                            className={`accordionIcon ${
                              toggleTradeOpen ? "reverse" : ""
                            }`}
                          ></span>
                        </div>
                        {toggleTradeOpen && (
                          <div className="accordionDropdown">
                            {[
                              !tokenOnMain && !userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={() =>
                                    resubmitAsset(
                                      "NFT",
                                      id,
                                      globalState,
                                      handleSuccess,
                                      handleError
                                    )
                                  }
                                >
                                  Resubmit Transfer
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleDeposit}
                                >
                                  Transfer To {otherNetworkName}
                                </button>
                              ),
                              tokenOnMain && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleWithdraw}
                                >
                                  Transfer From {otherNetworkName}
                                </button>
                              ),
                              userOwnsThisAsset && (
                                <button
                                  className="assetDetailsButton"
                                  onClick={handleSellAsset}
                                >
                                  Sell This Item
                                </button>
                              ),
                            ]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {globalState.address &&
                    !userOwnsThisAsset &&
                    storeId &&
                    buyPrice && (
                      <div className="detailsBlock detailsBlockSet">
                        <button
                          className="assetDetailsButton"
                          onClick={handleBuyAsset}
                        >
                          Buy This Item
                        </button>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {fileBrowserOpen ? <FileBrowser
        name={name}
        hash={hash}
        ext={ext}
        closeBrowser={() => setFileBrowserOpen(false)}
      /> : null}
    </>
  );
};

export default CardDetails;
