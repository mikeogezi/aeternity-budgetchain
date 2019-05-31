const contractSource = `
  contract BudgetChain =

    record budget =
      { creatorAddress : address,
        description : string,
        from : string,
        to : string,
        amount : int,
        parentId: int,
        reason: string, 
        _type : string,
        timestamp : int }

    /*
    record budgetSpend = 
      { creatorAddress : address,
        description : string,
        reason : string,
        _type : string,
        amount : int,  
        parentId : int,
        timestamp : int }
    */

    record state =
      { budgets : map(int, budgets),
        budgetsLength : int }

    function init() =
      { budgets = {},
        budgetsLength = 0 }

    public function getBudgets() : map(int, budget)

    public function getBudget(index : int) : budget =
      switch(Map.lookup(index, state.budgets))
        None => abort("There was no budget with this index registered.")
        Some(x) => x

    public stateful function registerBudget(desc' : string, from' : string, to' : string, amount' : int, timestamp' : int) =
      let budget = { creatorAddress = Call.caller, description = desc', from = from', to = to', amount = amount', _type = "allocation", timestamp = timestamp', reason = "", parentId = -1 }
      let index = getBudgetsLength() + 1
      put(state{ budgets[index] = budget, budgetsLength = index })

    public function getBudgetsLength() : int =
      state.budgetsLength

    public stateful function addBudgetExpense(index : int, reason' : reason, amount' : int, desc' : string, timestamp' : int) =
      let budget = getBudget(index)
      let budgetSpend = { creatorAddress = Call.caller, description = desc', reason = reason', _type = "spending", amount = amount', parentId = index, from = "", to = "", timestamp : timestamp' }
      let nIndex = getBudgetsLength() + 1
      put(state{ budgets[nIndex] = budgetExpense, budgetsLength = nIndex })
    /* Chain.spend(budget.creatorAddress, Call.value)
       let updatedVoteCount = budget.voteCount + Call.value
       let updatedBudgets = state.budgets{ [index].voteCount = updatedVoteCount }
       put(state{ budgets = updatedBudgets }) */
`;

//Address of the budget tracking smart contract on the testnet of the aeternity blockchain
const contractAddress = 'ct_wu1xGX6YDg5ViyAeXuYYMrxKE2L3sG9tQ8JdyMt3RJ2z7MP6J';
//Create variable for client so it can be used in different functions
var client = null;
//Create a new global array for the budgets
var budgetArray = [];
//Create a new variable to store the length of the budget globally
var budgetsLength = 0;

function renderBudgets() {
  //Order the budgets array so that the budget with the most votes is on top
  budgetArray = budgetArray.sort(function(a,b){return b.votes-a.votes})
  //Get the template we created in a block scoped variable
  let template = $('#template').html();
  //Use mustache parse function to speeds up on future uses
  Mustache.parse(template);
  //Create variable with result of render func form template and data
  let rendered = Mustache.render(template, {budgetArray});
  //Use jquery to add the result of the rendering to our html
  $('#budgetBody').html(rendered);
}

//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to get data of smart contract func, with specefied arguments
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  //Make another call to decode the data received in first call
  const decodedGet = await calledGet.decode().catch(e => console.error(e));

  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

  return calledSet;
}

//Execute main function
window.addEventListener('load', async () => {
  //Display the loader animation so the user knows that something is happening
  $("#loader").show();

  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.
  client = await Ae.Aepp();

  //First make a call to get to know how may budgets have been created and need to be displayed
  //Assign the value of budget length to the global variable
  budgetsLength = await callStatic('getBudgetsLength', []);

  //Loop over every budget to get all their relevant information
  for (let i = 1; i <= budgetsLength; i++) {

    //Make the call to the blockchain to get all relevant information on the budget
    const budget = await callStatic('getBudget', [i]);

    //Create budget object with  info from the call and push into the array with all budgets
    budgetArray.push({
      creatorName: budget.name,
      budgetUrl: budget.url,
      index: i,
      votes: budget.voteCount,
    })
  }

  //Display updated budgets
  renderBudgets();

  //Hide loader animation
  $("#loader").hide();
});

//If someone clicks to vote on a budget, get the input and execute the voteCall
jQuery("#budgetBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();
  //Create two new let block scoped variables, value for the vote input and
  //index to get the index of the budget on which the user wants to vote
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  //Promise to execute execute call for the vote budget function with let values
  await contractCall('voteBudget', [index], value);

  //Hide the loading animation after async calls return a value
  const foundIndex = budgetArray.findIndex(budget => budget.index == event.target.id);
  //console.log(foundIndex);
  budgetArray[foundIndex].votes += parseInt(value, 10);

  renderBudgets();
  $("#loader").hide();
});

//If someone clicks to register a budget, get the input and execute the registerCall
$('#registerBtn').click(async function(){
  $("#loader").show();
  //Create two new let variables which get the values from the input fields
  const name = ($('#regName').val()),
        url = ($('#regUrl').val());

  //Make the contract call to register the budget with the newly passed values
  await contractCall('registerBudget', [url, name], 0);

  //Add the new created budgetobject to our budgetarray
  budgetArray.push({
    creatorName: name,
    budgetUrl: url,
    index: budgetArray.length+1,
    votes: 0,
  })

  renderBudgets();
  $("#loader").hide();
});
