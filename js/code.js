const urlBase = (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '143.198.126.177' || window.location.origin.includes('cop4331c')))
  ? '/apifiles/index.php'
  : 'https://lamp.cop4331clampproject.com/api/index.php';

const loginUrlBase = urlBase;

let userId = 0;
let firstName = "";
let lastName = "";

function doLogin() 
{
  firstName = "";
  lastName = "";

  let loginInput = document.getElementById("logInUsername");
  let passwordInput = document.getElementById("logInPassword");
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";

  document.getElementById("loginResult").innerHTML = "";

  let jsonPayload = JSON.stringify({login: login, password: password});
  let url = loginUrlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  try 
  {
    xhr.onreadystatechange = function()
    {
      if (this.readyState === 4)
      {
        if(this.status === 200)
        {
          let jsonObject = JSON.parse(xhr.responseText);
          userId = jsonObject.id;

          if (userId < 1)
          {
            document.getElementById("loginResult").innerHTML = "<i></i> Username or Password Incorrect";
            return;
          }

          firstName = jsonObject.firstName;
          lastName = jsonObject.lastName;

          saveCookie();

          //Tells the difference between admin and normal account
          if(jsonObject.role === "Admin")
          {
            window.location.href = "admin.html";
          }
          else
          {
            window.location.href = "user.html"
          }

        }
        else
        {
          document.getElementById("loginResult").innerHTML = "<i></i> Login failed";
        }
      }
    };
    xhr.send(jsonPayload);
  }
  catch(err)
  {
    document.getElementById("loginResult").innerHTML = err.message;
  }

}

function saveCookie()
{
  let minutes = 20;
  let date = new Date();
  date.setTime(date.getTime() + minutes *60 * 1000);
  document.cookie = "firstName=" + encodeURIComponent(firstName) +
   ",lastName=" + encodeURIComponent(lastName) + ",userID=" + userId +
   ";expires=" + date.toGMTString() + ";path=/";
}

function readCookie()
{
  userId = -1; 
  let data = document.cookie;
  let splits = data.split(";");
  for (var i = 0; i < splits.length; i++) 
  {
    let pair = splits[i].trim();
    let tokens = pair.split(",");
    for (var j = 0; j < tokens.length; j++) 
    {
      let keyVal = tokens[j].trim().split("=");
      if (keyVal[0] === "firstName") 
      {
        firstName = decodeURIComponent(keyVal[1] || "");
      } 
      else if (keyVal[0] === "lastName") 
      {
        lastName = decodeURIComponent(keyVal[1] || "");
      } 
      else if (keyVal[0] === "userID") 
      {
        userId = parseInt(keyVal[1].trim());
      }
    }
  }

  // if (userId < 0 || isNaN(userId)) {
  //   window.location.href = "index.html";
  // } else {
  //   let userNameEl = document.getElementById("userName");
  //   if (userNameEl) {
  //     userNameEl.innerHTML = `<i class="bi bi-person-circle me-1 text-primary"></i> <span>Logged in as <strong class="text-white">${firstName} ${lastName}</strong></span>`;
  //   }
    //Here do either search contacts or search people.
  }

}

function doLogout() 
{
  userId = 0;
  firstName = "";
  lastName = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  window.location.href = "index.html";
}

//Admin function that searches registered users (included other admin)
function searchAccount()
{
  let srchInput = document.getElementById("searchPeople");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("searchPeopleResult");
  resultSpan.innerHTML = "";

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try 
  {
    xhr.onreadystatechange = function () 
    {
      if (this.readyState === 4 && this.status === 200) 
        {
        resultSpan.innerHTML = "<i class='bi bi-check-circle me-1'></i> Results updated";
        let jsonObject = JSON.parse(xhr.responseText);
        let targetP = document.getElementById("accountList") || document.getElementsByTagName("p")[0];
        
        let people = jsonObject.users || [];

        if (people.length === 0 && Array.isArray(jsonObject.results) && jsonObject.results.length > 0) {
          people = jsonObject.results.map(name => ({  
            ID: null, 
            FirstName: "",  
            LastName: "", 
            Login: name, 
            Role: "", 
            Enabled: null, 
            DateCreated: "",
            DateUpdated: ""
          }));
        }

        if (people.length === 0 || jsonObject.error === "No Records Found") {
          if (targetP) targetP.innerHTML = `<div class="text-secondary-contrast small italic py-2"><i class="bi bi-info-circle me-1"></i> No matching acounts found.</div>`;
          return;
        }

        let accountList = "";
        for(let i =0; i <people.length; i++)
        {
          let p = people[i];
          let contacts = p.contacts || [];
          let accountName = typeof p === 'string' ? p : p.Login
          let contactsMarkup = "";
          let accountId = (typeof p === 'object' && p.ID) ? p.ID: null 

          //Make the contact list into a html string list
          if(contacts.length > 0)
          {
            contactsMarkup = contacts.map(contact => `<div>• ${contact.name}</div>`).join('');
          }
          else{
            contactsMarkup = 'No contacts'
          }

          accountList += `
          <div>
            <div>
              <span class="me-2">${accountName}</span>
              <button type="button" class="btn-close btn-close-white" style="font-size: 0.65rem;" onclick="disableAccount(${accountId ? accountId : `'${accountName.replace(/'/g, "\\'")}'`});" title="Disable Account"></button>
            </div>
            <details class="small">
              <summary class="text-primary role-button" style="cursor: pointer; user-select: none;">
                Contacts (click to expand)
              </summary>
              <div class="mt-2 ps-2 border-start border-secondary">
                ${contactsMarkup}
              </div>
            </details>
          </div>`;
        }
        if(targetP)
        {
          targetP.innerHTML = accountList;
        }
      }
    };
    xhr.send();
  }
  catch(err)
  {
    resultSpan.innerHTML = err.message; 
  }
}

//User account function to search through contacts by using first name and last name
function searchContacts()
{
  let srchInput = document.getElementById("searchContacts");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("searchContactsResult");
  resultSpan.innerHTML = "";

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

}

//Function used by register.html page to make user account or by admin.html to make new admin account
function addAcount(redirect)
{
  let firstNameInput = document.getElementById("firstNameInput");
  let lastNameInput = document.getElementById("lastNameInput");
  let loginInput = document.getElementById("loginInput");
  let passwordInput = document.getElementById("passwordInput")
  let accountResult = document.getElementById("accountFeedback")

  accountResult.innerHTML = "";

  if(!firstNameInput)
  {
    accountResult.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter your first name ";
    return;
  }

  if(!lastNameInput)
  {
    accountResult.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter your last name ";
    return;
  }

  if(!loginInput)
  {
    accountResult.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter a login";
    return;
  }

  if(!passwordInput)
  {
    accountResult.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter a password";
    return;
  }

  let jsonPayload = Json.stringify({
    firstName: firstNameInput, 
    lastName: lastNameInput,
    login: loginInput,
    password: passwordInput
  })


  let url = urlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try
  {
    xhr.onreadystatechange = function () 
    {
      if (this.readyState === 4) 
      {
        if (this.status === 201 || this.status === 200) 
        {
          if(redirect)
          {
            window.location.href = index.html;
          }
          else
          {
            accountResult.innerHTML = "Account sucesfully created";
            searchAccount();
          }
        }
        else
        {
          try 
          {
            let res = JSON.parse(xhr.responseText);
            accountResult.innerHTML = res.error || "Failed to make account";
          } catch (e) {
            accountResult.innerHTML = "Error making account";
          }
        }
      }
    };
    xhr.send(jsonPayload)
  }
  catch(err)
  {
    accountResult.innerHTML = err.message;
  }
}

//User function to add a new contact to their account
function addContact()
{

}

//User function that 
function deleteContact()
{

}


//Function used by admin to disable an account
function disableAccount(identifer)
{

}

//Admin function to change another account's password
function updatePassword()
{

}

