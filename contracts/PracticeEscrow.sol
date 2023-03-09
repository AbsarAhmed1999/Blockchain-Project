//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _token
    ) external;
}

contract PracticeEscrow {
    // nftAddress is address where pic/video/art is stored also known as token
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;

    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only buyer can call this method");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this method");
        _;
    }

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer; // Nft 1 is address ny purchase ki hai
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    constructor(
        address _nftaddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftaddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    // Taking Nft from seller wallet & moving it to escrow
    // jis ko Nft behj raha hun uska address input karo
    function list(
        uint256 _nftId,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        //Transfer NFT from seller to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftId);
        isListed[_nftId] = true;
        purchasePrice[_nftId] = _purchasePrice;
        escrowAmount[_nftId] = _escrowAmount;
        buyer[_nftId] = _buyer;
    }

    // Earnest money is money paid to confirm contract
    // Put under contract ( only Buyer - payable escrow)
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(msg.value >= escrowAmount[_nftID]);
    }

    function updateInspectionStatus(uint256 _nftID, bool _passed)
        public
        onlyInspector
    {
        inspectionPassed[_nftID] = _passed;
    }

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    // Finialize Sale
    // -> Require inspection status (add more items here like apprasail)
    // -> Require sale to be authorized
    //-> Require funds to be correct amount
    //-> Transfer NFT to buyer
    // -> Transfer funds to seller

    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID]);
        require(approval[_nftID][buyer[_nftID]]);
        require(approval[_nftID][seller]);
        require(approval[_nftID][lender]);

        require(address(this).balance >= purchasePrice[_nftID]);
        // send ether to seller
        //call is method used to send the msg we want to & to interact with other smart
        // contract
        // it returns success , failure error msg
        // we call function by using calle.call()
        isListed[_nftID] = false;
        (bool success, ) = payable(seller).call{value: address(this).balance}(
            ""
        );
        require(success);
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);
    }

    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }

    // let smart contract receive ethers
    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
