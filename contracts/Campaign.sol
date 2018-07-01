pragma solidity ^0.4.17;

contract Campaign{
    struct Request{
        string description;
        uint amount;
        address recipient;
        mapping(address => bool) votes;
        uint voteCount;
        bool isOpen;
    }

    address public manager;
    mapping(address => bool) public contributors;
    uint public contributorsCount;
    Request[] public requests;
    uint public minimumDonation;

    constructor(uint minimum) public{
        manager = msg.sender;
        minimumDonation = minimum;
    }

    modifier isTheOwner(){
        require(msg.sender == manager,'only manager can aprove');
        _;
    }

    modifier isContributor(){
        require(contributors[msg.sender] == true, '');
        _;
    }

    modifier hasDonatedBefore(){
        require(contributors[msg.sender]==false,'already donated');
        _;
    }

    modifier isDonatingThemMin(){
        require(msg.value >= minimumDonation, 'donate more money');
        _;
    }

    modifier hasAprovedBefore(uint requestIndex){
        require(requests[requestIndex].votes[msg.sender] == false, 'already aproved this request');
        _;
    }

    modifier requireRequestOpen(uint requestIndex){
      require(requests[requestIndex].isOpen == true, 'request is close');
      _;
    }

    function donate() public payable isDonatingThemMin hasDonatedBefore{
        contributors[msg.sender] = true;
        contributorsCount++;
    }

    function getBalance() public view returns(uint){
        return address(this).balance / 1 ether;
    }

    function createRequest(string description,uint amount,address recipient) public isTheOwner{

        Request memory newRequest = Request({
            description:description,
            amount:amount,
            recipient: recipient,
            voteCount:0,
            isOpen:true
        });

        requests.push(newRequest);
    }

    function aproveRequest(uint requestIndex) public hasAprovedBefore(requestIndex){
        require(contributors[msg.sender]==true,'has aproved before');
        requests[requestIndex].votes[msg.sender] = true;
        requests[requestIndex].voteCount ++;
    }

    function endRequest(uint requestIndex) public payable{
        require(msg.sender == manager);
        require(requests[requestIndex].isOpen == true, 'request is closed');
        require((requests[requestIndex].voteCount / contributorsCount)*100 > 50, 'not enought votes');
        requests[requestIndex].isOpen = false;
        requests[requestIndex].recipient.transfer(requests[requestIndex].amount);
    }
}
