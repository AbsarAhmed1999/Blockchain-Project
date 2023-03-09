import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// config
import config from "./config.json";
function PracticeApp() {
  const [escrow, setEscrow] = useState(null);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [homes, setHomes] = useState([]);
  const [home, setHome] = useState({});
  const [toggle, setToggle] = useState(false);
  const loadBlockchainData = async () => {
    // MetaMask injects a global API into websites visited by its users at window.ethereum
    // gives ability to create and sign transactions & access etherum decentralized app
    // ethers.providers.web3provider is a connection
    // There are many providers example : infura/ alchemy / web3
    // these are nodes to which our computer connects
    const provider =
      window.ethereum != null
        ? new ethers.providers.Web3Provider(window.ethereum)
        : ethers.providers.getDefaultProvider();
    setProvider(provider);
    // on Method allow us to register for this event listener
    window.ethereum.on("accountsChanged", async () => {
      // Fetching all/Multiple accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      // Using 1 account from multiple accounts
      const account = ethers.utils.getAddress(accounts[0]);
      // setting 1 account
      setAccount(account);
    });
    // Network Id is initliazed
    const network = await provider.getNetwork();
    // RealEstate contract is deployed. Ethers library helping to deploy contract
    // To deploy contract we need 3 things
    // 1) Address , 2) ABI  3)signerOrProvider
    const realEstate = new ethers.Contract(
      config[network.chainId].realEstate.address,
      RealEstate,
      provider
    );
    const totalSupply = await realEstate.totalSupply();
    const homes = [];

    // fetching nft one by one & storing into an array. bcz mapping does not allow looping
    for (var i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i);
      const response = await fetch(uri);
      const metadata = await response.json();
      homes.push(metadata);
    }
    setHomes(homes);
    console.log(homes);

    console.log(totalSupply.toString());
    const escrow = new ethers.Contract(
      config[network.chainId].escrow.address,
      Escrow,
      provider
    );
    setEscrow(escrow);
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const togglePop = (home) => {
    setHome(home);
    toggle ? setToggle(false) : setToggle(true);
  };
  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className="cards__section">
        <h3>Homes For You</h3>

        <hr />

        <div className="cards">
          {homes.map((home, index) => (
            <div className="card" key={index} onClick={() => togglePop(home)}>
              <div className="card__image">
                <img src={home.image} alt="Home" />
              </div>
              <div className="card__info">
                <h4>{home.attributes[0].value} ETH</h4>
                <p>
                  <strong>{home.attributes[2].value}</strong> bds |
                  <strong>{home.attributes[3].value}</strong> ba |
                  <strong>{home.attributes[4].value}</strong> sqft
                </p>
                <p>{home.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toggle && (
        <Home
          home={home}
          provider={provider}
          account={account}
          escrow={escrow}
          togglePop={togglePop}
        />
      )}
    </div>
  );
}

export default PracticeApp;
