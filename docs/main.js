import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import carmarketAbi from '../contract/carmarket.abi.json'
import erc20Abi from "../contract/erc20.abi.json"


const ERC20_DECIMALS = 18
const MPContractAddress = "0x10258DcAdBeef6740c148BF4c6d2520Fcee64bbc"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit
let contract
let cars = []

const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Approve the Celo Car Market to use it...")
    try {
      await window.celo.enable()
      notificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(carmarketAbi, MPContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(MPContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}


const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

const getCars = async function() {
  const _numberOfCarsAvailable = await contract.methods.viewNumberOfCarsAvailable().call()
  const _cars = []

  for (let i = 0; i < _numberOfCarsAvailable; i++) {
    let _car = new Promise(async (resolve, reject) => {
      let p = await contract.methods.viewCar(i).call()
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        location: p[4],
        price: new BigNumber(p[5]),
        sold:p[6],
      })
    })
    _cars.push(_car)
  }
  cars = await Promise.all(_cars)
  renderCars()
}


function renderCars() {
  document.getElementById("carmarket").innerHTML = ""
  cars.forEach((_car) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = carTemplate(_car)
    document.getElementById("carmarket").appendChild(newDiv)
  })
}



function carTemplate(_car) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_car.image}" alt="...">
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_car.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_car.name}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_car.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_car.location}</span>
        </p>
        ${(_car.owner === kit.defaultAccount) && (_car.sold === false)  ? `<div class="d-grid gap-2">
        <a class="btn btn-lg btn-outline-dark cancelSaleBtn fs-6 p-3"  id=${_car.index} >
          Cancel Sale 
        </a>
      </div>`
          :
          _car.owner === kit.defaultAccount ? `<div class="d-grid gap-2">
        <a class="btn btn-lg btn-outline-dark upgradeBtn fs-6 p-3"  id=${_car.index} >
          Upgrade 
        </a>
      </div>`
       :
          `<div class="d-grid gap-2">
              <a class="btn btn-lg btn-outline-success buyBtn fs-6 p-3" id=${
                _car.index
              }>
                Buy for ${_car.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
              </a>
            </div>`
            }
      </div>
    </div>
  `
}


function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}


window.addEventListener('load', async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getCars()
  notificationOff()
});


document
  .querySelector("#newCarBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newCarName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newCarDescription").value,
      document.getElementById("newLocation").value,
      new BigNumber(document.getElementById("newPrice").value)
      .shiftedBy(ERC20_DECIMALS)
      .toString()
    ]
    notification(`⌛ Adding "${params[0]}"...`)
    try {
      const result = await contract.methods
        .addHouse(...params)
        .send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added "${params[0]}". 🎉`)
    getCars()
  })


 document.querySelector("#carmarket").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(cars[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${cars[index].name}"...`)
    try {
      const result = await contract.methods
        .buyCar(index)
        .send({ from: kit.defaultAccount })
      notification(`🎉 You successfully bought "${cars[index].name}". 🎉`)
      getCars()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }


  if (e.target.className.includes("upgradeBtn")) {
    const index = e.target.id
    let price = prompt(`Enter new price for "${cars[index].name} (cUSD) ":`)
    let image = prompt(`Enter upgrade image for "${cars[index].name}":`)
    if (price != null) {
      price= new BigNumber(price)
      notification(`⌛ Upgrading "${cars[index].name}"...`)
      try {
        const result = await contract.methods
          .upgradeCar(index,price,image)
          .send({ from: kit.defaultAccount })
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }

      

      notification(`🎉 You successfully upgraded "${cars[index].name}". 🎉`)
      getCars()
      getBalance() 
    }
    else {
      alert("⚠️ You must enter a price.")
    }
  }

  if (e.target.className.includes("cancelSaleBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for abort-sale approval...")
    try {
      await approve(cars[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Aborting sale of "${cars[index].name}"...`)
    try {
      const result = await contract.methods
        .cancelSale(index)
        .send({ from: kit.defaultAccount })
      notification(`🎉 Cancelling sale of "${cars[index].name}" successful. 🎉`)
      getCars()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }
})