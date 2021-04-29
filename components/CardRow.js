import React, {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/router";
// import AssetCard from "./Card";
import AssetCardSwitch from "./CardSwitch";
import Asset from "./Asset";

const CardRow = ({ data, name, cardSize, selectedView, setSelectedView, /* cardSvgSource, */ tilt, onTokenClick }) => {
    // <div>Have token: {JSON.stringify(token)}</div>

    return (
        <div className="mainRow">
            <div className="notch">
              <div className="nub"></div>
              <div className="text">{name}</div>
              <div className="underline"></div>
            </div>
            {data &&
                data.map((asset) => {
                    if (asset.totalSupply === 0) {
                      return;
                    }
                    const {
                      id,
                      isMainnet,
                      isPolygon,
                      name,
                      description,
                      image,
                      properties: {
                        hash,
                        filename,
                        ext,
                      },
                      external_url,
                      totalSupply,
                      balance,
                      buyPrice,
                      storeId,
                      owner,
                      minter,
                    } = asset;
                    const props = {
                      key: id,
                      id,
                      isMainnet,
                      isPolygon,
                      assetName: name,
                      description,
                      image,
                      hash,
                      external_url,
                      filename,
                      ext,
                      totalSupply,
                      balance,
                      buyPrice,
                      storeId,
                      ownerAvatarPreview: owner.avatarPreview,
                      ownerUsername: owner.username,
                      ownerAddress: owner.address,
                      minterAvatarPreview: minter.avatarPreview,
                      minterUsername: minter.username,
                      minterAddress: minter.address,
                      cardSize,
                      networkType: 'sidechain',
                      tilt: true,
                      onClick: e => {
                        onTokenClick && onTokenClick(asset.id)(e);
                      },
                    };
                    return (
                      <AssetCardSwitch
                        {...props}
                        selectedView={selectedView}
                        setSelectedView={setSelectedView}
                      />
                    );
                })}
        </div>
    );
};

export default CardRow;
