// SPDX-License-Identifier: MIT

/// @dev solitity version.
pragma solidity >=0.7.0 <0.9.0; //this contract works for solidty version from 0.7.0 to less than 0.9.0

/**
* @dev Required interface of an ERC20 compliant contract.
*/
interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

/**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address, uint256) external returns (bool);

 /**
     * @dev Transfers `tokenId` token from `from` to `to`
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);


    function totalSupply() external view returns (uint256);

/*
*@dev Returns the number of tokens in``owner``'s acount.
*/
    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

/*
*@dev Emitted when `tokenId` token is transferred from `from` to `to`.
*/
    event Transfer(address indexed from, address indexed to, uint256 value);

/*
*@dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
*/  
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract CarMarket {
    uint private numberOfCarsAvailable = 0;

    /// @dev stores the cUsdToken Address
    address private cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

/* @dev Car structure 
* data needed includes: 
* - ``owner``'s address,
* - name of Car (ie Toyota, Kia, RangeRover,...)
* - description of Car (ie Black, White, Milk,...)
* - location of Car (ie CA, USA)
* - price of Car
* - sold (A bool variable that intialized to false. When set to true, it means the Car has been purchased and is off the market.)
*/
    struct Car {
        address payable owner;
        string name;
        string image;
        string description;
        string location;
        uint price;
        bool sold;
    }

    /// @dev stores each Car created in a list called Cars
    mapping(uint => Car) private Cars;

    /// @dev maps the index of item in Cars to a bool value (initialized as false)
    mapping(uint => bool) private exists;

    /// @dev checks if caller is the Car owner
    modifier checkIfCarOwner(uint _index) {
        require(Cars[_index].owner == msg.sender, "Unauthorized caller");
        _;
    }

    /// @dev checks price of Car is at least one wei
    modifier checkPrice(uint _price) {
        require(_price > 0, "Price must be at least one wei");
        _;
    }

    /// @dev checks Cars(_index) exists
    modifier exist(uint _index) {
        require(exists[_index], "Query of nonexistent Car");
        _;
    }

    /// @dev allow users to add a Car to the marketplace
    function addCar(
        string calldata _name,
        string calldata _image,
        string calldata _description,
        string calldata _location,
        uint _price
    ) public checkPrice(_price) {
        require(bytes(_name).length > 0, "Empty name");
        require(bytes(_image).length > 0, "Empty image url");
        require(bytes(_description).length > 0, "Empty description");
        require(bytes(_location).length > 0, "Empty location");
        Cars[numberOfCarsAvailable] = Car(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _location,
            _price,
            false // sold initialized as false
        );
         exists[numberOfCarsAvailable] = true;
        numberOfCarsAvailable++;
    }

    /// @dev allow users view details of Car
    function viewCar(uint _index)
        public
        view
        exist(_index)
        returns (Car memory)
    {
        return (Cars[_index]);
    }

    /// @dev allow users to buy a Car on sale
    /// @notice current car owners can't buy their own car
    function buyCar(uint _index) external payable exist(_index) {
        require(
            Cars[_index].owner != msg.sender,
            "You can't buy your own Cars"
        );
        require(!Cars[_index].sold, "Car isn't on sale");
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                Cars[_index].owner,
                Cars[_index].price
            ),
            "Transfer failed."
        );
        Cars[_index].owner = payable(msg.sender);
    }
    /*
    /// @dev allow users to resell a Car
    /// @param _price is the new selling price
    function reSellCar(uint _index, uint _price)
        public
        payable
        exist(_index)
        checkIfCarOwner(_index)
        checkPrice(_price)
    {
        Cars[_index].price = _price;
        Cars[_index].sold = false;
    }
    */

    /// @dev allow users to cancel a sale on a Car
    /// @notice callable only by the car owner
    function cancelSale(uint _index)
        public
        payable
        exist(_index)
        checkIfCarOwner(_index)
    {
        Cars[_index].sold = true;
    }


    /// @dev shows the number of Cars in the contract
    function viewNumberOfCarsAvailable() public view returns (uint) {
        return (numberOfCarsAvailable);
    }
    
    /// @dev allows users to upgrade a car
    /// @dev users can upgrade car by changing car price and car image
    /// @notice only callable by car owner

    function upgradeCar(uint _index, uint _price, string memory _image)
        public
        payable
        exist(_index)
            checkIfCarOwner(_index)
        checkPrice(_price)          
    {
        Cars[_index].price = _price;
        Cars[_index].image = _image;
        Cars[_index].sold = false;
    }
    
}

