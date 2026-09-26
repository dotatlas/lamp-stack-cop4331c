const urlBase = (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '143.198.126.177' || window.location.origin.includes('cop4331c')))
  ? '/apifiles/index.php'
  : 'https://lamp.cop4331clampproject.com/api/index.php';

const loginUrlBase = urlBase + '?action=login';

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
          try 
          {
            let res = JSON.parse(xhr.responseText);
            document.getElementById("loginResult").innerHTML = res.error || "Login failed";
          }
          catch (e) 
          {
            document.getElementById("loginResult").innerHTML = "Login failed";
          }
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

   if (userId < 0 || isNaN(userId)) {
     window.location.href = "index.html";
   } else {
     let userNameEl = document.getElementById("userName");
     if (userNameEl) {
       userNameEl.innerHTML = `<i class="bi bi-person-circle me-1 text-primary"></i> <span>Logged in as <strong class="text-white">${firstName} ${lastName}</strong></span>`;
     }
  }

}

function doLogout() 
{
  userId = 0;
  firstName = "";
  lastName = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "userID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
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

        if (people.length === 0 || jsonObject.error === "No Records Found") {
          if (targetP) targetP.innerHTML = `<div class="text-secondary-contrast small italic py-2"><i class="bi bi-info-circle me-1"></i> No matching acounts found.</div>`;
          return;
        }

        let accountList = "";
        for(let i =0; i <people.length; i++)
        {
          let p = people[i];
          let contacts = p.contacts || [];
          let accountName = p.Login
          let contactsMarkup = "";
          let accountId = p.id

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
              <button type="button" 
              class="btn btn-sm btn-outline-light" 
                style="font-size: 0.65rem;" 
                onclick="toggleAccount(${accountId ? accountId : `'${accountName.replace(/'/g, "\\'")}'`}, ${p.Enabled});" 
                title="${p.Enabled ? 'Disable Account' : 'Enable Account'}">
                ${p.Enabled ? 'Disable' : 'Enable'}
              </button>
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
      else{
        let res = JSON.parse(xhr.responseText);
        resultSpan.innerHTML = res.error;
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

  let url = urlBase + "?contacts=search";
  if (srch) {
    url += "&q=" + encodeURIComponent(srch);
  }

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        resultSpan.innerHTML = "<i class='bi bi-check-circle me-1'></i> Results updated";
        let jsonObject = JSON.parse(xhr.responseText);
        let targetP = document.getElementById("contactList");

        let contacts = jsonObject.contacts || [];
        if (contacts.length === 0 && Array.isArray(jsonObject.results) && jsonObject.results.length > 0) {
          contacts = jsonObject.results.map(name => ({ id: null, name: name }));
        }

        if (contacts.length === 0 || jsonObject.error === "No Records Found") {
          if (targetP) targetP.innerHTML = `<div class="text-secondary-contrast small italic py-2"><i class="bi bi-info-circle me-1"></i> No matching contacts found.</div>`;
          return;
        }

        let contactList = "";
        for (let i = 0; i < contacts.length; i++) {
          let c = contacts[i];
          let contactName = typeof c === 'string' ? c : c.name;
          let contactId = (typeof c === 'object' && c.id) ? c.id : null;

          contactList += `<span class="badge rounded-pill bg-dark-subtle text-body border border-secondary px-3 py-2 fs-6 shadow-sm d-inline-flex align-items-center me-2 mb-2">
            <span class="d-inline-block rounded-circle me-2 border" style="width: 14px; height: 14px; background-color: ${contactName};"></span>
            <span class="me-2">${contactName}</span>
            <button type="button" class="btn-close btn-close-white" style="font-size: 0.65rem;" onclick="deleteContact(${contactId ? contactId : `'${contactName.replace(/'/g, "\\'")}'`});" title="Delete Contact"></button>
          </span>`;
        }

        if (targetP) {
          targetP.innerHTML = contactList;
        }
      }
    };
    xhr.send();
  } catch (err) {
    resultSpan.innerHTML = err.message;
  }
}

//Function used by register.html page to make user account or by admin.html to make new admin account
function addAccount(redirect)
{
  let firstNameInput = document.getElementById("firstNameInput");
  let lastNameInput = document.getElementById("lastNameInput");
  let loginInput = document.getElementById("loginInput");
  let passwordInput = document.getElementById("passwordInput")
  let accountResult = document.getElementById("accountFeedback")

  let firstName = firstNameInput ? firstNameInput.value.trim() : "";
  let lastName = lastNameInput ? lastNameInput.value.trim() : "";
  let username = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value : "";

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

  let jsonPayload = JSON.stringify({
    firstName: firstName, 
    lastName: lastName,
    login: username,
    password: password
  })

  let url = "";
  const page = window.location.pathname.split('/').pop();

  if(page === 'register.html')
  {
    url = urlBase + '?register='+ encodeURIComponent('register');
  }
  else if(page === 'admin.html')
  {
    url = urlBase + '?admin='+ encodeURIComponent('create');
  }
  
  if(url === "")
  {
    accountResult.innerHTML = "error";
    return;
  }

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
            window.location.href = "index.html";
          }
          else
          {
            accountResult.innerHTML = "Account successfully created";
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
    xhr.send(jsonPayload);
  }
  catch(err)
  {
    accountResult.innerHTML = err.message;
  }
}

//User function to add a new contact to their account
function addContact()
{
  newContactFirstName = document.getElementById("firstName");
  newContactLastName = document.getElementById("lastName");
  newContactPhone = document.getElementById("phone");
  newContactEmail = document.getElementById("email");
  newContactFeedback = document.getElementById("contactAddResult");

  if(!newContactFirstName || !newContactLastName || !newContactPhone || !newContactEmail)
  {
    newContactFeedback.innerHTML = "You cannot leave a field blank"
  }

  let jsonPayload = JSON.stringify({
    firstName: newContactFirstName.value.trim(),
    lastName: newContactLastName.value.trim(),
    phone: newContactPhone.value.trim(),
    email: newContactEmail.value.trim()
  });

  let url = urlBase + '?contacts=add';
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try 
  {
    xhr.onreadystatechange = function()
    {
      if (this.readyState === 4)
      {
        if(this.status === 200 || this.status === 201)
        {
          newContactFeedback = "New Contact Added";
          newContactFirstName.value = "";
          newContactLastName.value = "";
          newContactEmail.value = "";
          newContactPhone.value = "";
          searchContacts();
        }
        else
        {
          try
          {
            let res = JSON.parse(this.responseText);
            newContactFeedback.innerHTML = res.error || "Failed to add contact"
          }
          catch(e)
          {
            newContactFeedback.innerHTML = "Error Adding Contact"
          }
        }
      }
    };
    xhr.send(jsonPayload);
  }
  catch(err)
  {
    newContactFeedback.innerHTML = err.message;
  }
}

//User function that deletes the selected Contact
function deleteContact(identifier)
{
  if(!identifier && !identifier !== 0)
  {
    return;
  }



}


//Function used by admin to disable an account
function toggleAccount(identifer, isEnabled)
{
  let accountStatusResult = document.getElementById("statusResult");

  if (!identifer && identifer !== 0) 
  {
    return;
  }

  let url = urlBase + "?admin=status&id=" + encodeURIComponent(identifer);

  let jsonPayload = JSON.stringify({
    enabled: isEnabled
  });

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId)
  xhr.setRequestHeader("X-User-Id", userId);

  try
  {
    xhr.onreadystatechange = function() 
    {
      if(this.readyState === 4)
      {
        if(this.status === 200)
        {
          res = JSON.parse(xhr.responseText);
          accountStatusResult.innerHTML = res.message;
          isEnabled = res.enabled;
        }
        else
        {
          res = JSON.parse(xhr.responseText);
          accountStatusResult.innerHTML = res;
        }
      }
    };
    xhr.send(jsonPayload);
  }
  catch
  {
    accountStatusResult.innerHTML = "Error in toggling account"
  }
}

//Admin function to change another account's password
function updatePassword(identifer)
{
  newPassword = document.getElementById("newPasswordInput");
  passwordResult = document.getElementById("passwordResult");


  if (!identifer && identifer !== 0) 
  {
    return;
  }

  let url = urlBase + "?admin=password&id=" + encodeURIComponent(identifer);

  let jsonPayload = JSON.stringify({
    password: newPassword.value
  });

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId)
  xhr.setRequestHeader("X-User-Id", userId);

  try
  {
    xhr.onreadystatechange = function()
    {
      if(this.readyState === 4)
      {
        if(this.status === 200)
        {
          passwordResult.innerHTML = "Password successfully";
        }
        else{
          passwordResult.innerHTML = "Login failed";
        }
      }
      else
      {
        passwordResult.innerHTML = ""
      }
    };
    xhr.send(jsonPayload);
  }
  catch(err)
  {
    passwordResult.innerHTML = err.message;
  }

}

function updateContact()
{

}
