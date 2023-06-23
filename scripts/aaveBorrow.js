const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
//const { networkConfig } = require("../helper-hardhat-config")
//the aave protocal treat 所有东西 as ERC20 token
async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    //abi, address
    //lending pool address provider:0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    //从lending pool address provider获得lending pool

    const lendingPool = await getLendingPool(deployer)
    console.log(`lending pool address${lendingPool.address}`)
    //现在我们有了WETH，我们有了lending pool address，接下来做什么
    //deposit!!!!

    //const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    //approve
    //我们给lendingPool权限去提取我们的token
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing WETH...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Desposited!")

    //我们想知道能借多少，已经借了多少，我们有的抵押是多少
    // // Getting your borrowing stats
    //availableBorrowsETH，DAI的转化率是多少
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
        lendingPool,
        deployer
    )
    const daiPrice = await getDaiPrice()
    //现在我们有了daiprice，我们可以知道我们想借多少DAI
    //0.95是因为我们不想借最大数量
    const amountDaiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())

    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(
        amountDaiToBorrow.toString()
    )
    //下面是borrow
    await borrowDai(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        //networkConfig[network.config.chainId].daiToken,
        lendingPool,
        amountDaiToBorrowWei,
        deployer
    )

    await getBorrowUserData(lendingPool, deployer)
    await repay(
        amountDaiToBorrowWei,
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        //networkConfig[network.config.chainId].daiToken,
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
}
//需要approve
async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrow,
        1,
        0,
        account
    )
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}
//我们不需要连接deployer，因为我们不发送任何交易，只是读一下
async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
        //networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function approveErc20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    signer
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        signer
    )
    txResponse = await erc20Token.approve(spenderAddress, amountToSpend)
    await txResponse.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        //networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    )
    return lendingPool
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
