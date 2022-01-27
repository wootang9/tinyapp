const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const PORT = 8080;
const app = express();
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: 'lighthouseUser'
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: 'chandler'
  }
};

const users = { 
  "chandler": {
    id: "chandler", 
    email: "mschanandler@bong.com", 
    password: "couldiBEapassword"
  },
 "davidortiz": {
    id: "davidortiz", 
    email: "david@ortiz.com", 
    password: "Th15password"
  }
};

// const findCurrentUser = (userObj) => {
//   if (!req.cookies["user_id"]) {
//     return null
//   }
//   for (const user in userObj) {
//     if (req.cookies["user_id"] === user) {
//       return user;
//     }
//   }
// };

// const checkUserLoggedIn = () => {
//   if (req.cookies["user_id"]) {
//     return true;
//   } else return false;
// }

const generateRandom6DigitString = () => {
  let charSet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
    for (let i = 6; i > 0; --i) {
      result += charSet[Math.floor(Math.random() * 62)];
    }
  return result;
};

//get root and redirect to URL page
app.get('/', (req, res) => {
  res.redirect('/urls');
})

//create new URL page
app.get('/urls/new', (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect('/login');
  }
  const templateVars = {
    user_id: req.cookies["user_id"],
    user: users[req.cookies["user_id"]],
  };
  res.render('urls_new', templateVars);
});

//My URL page with all URLs, also home page
app.get('/urls', (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect('/login');
  }
  const templateVars = {
    urls: urlDatabase,
    user_id: req.cookies["user_id"],
    user: users[req.cookies["user_id"]]
  };
  res.render('urls_index', templateVars);
});

//renders the indiv page per URL
app.get('/urls/:shortURL', (req, res) => {
  let keys = Object.keys(urlDatabase)
  
  //checks for valid shortURL path
  if (!keys.includes(req.params.shortURL)) {
    res.status(403).send('Invalid URL Path');

    //checks to match current user ID with creator ID
  } else if (urlDatabase[req.params.shortURL]["userID"] !== req.cookies["user_id"]) {
      res.send("You may only view URLs that you created");

    //render the page
  } else {
    const templateVars = {
      shortURL: req.params.shortURL, 
      longURL: urlDatabase[req.params.shortURL]["longURL"],
      user_id: req.cookies["user_id"],
      user: users[req.cookies["user_id"]],
      userThatCreated: urlDatabase[req.params.shortURL]["userID"]
    };
    res.render('urls_show', templateVars)
  }
}); 

//renders registration page
app.get('/register', (req, res) => {
  const templateVars = {
    user_id: req.cookies["user_id"],
    user: users[req.cookies["user_id"]]
  };
  res.render('urls_register', templateVars)
});

//renders login page
app.get('/login', (req, res) => {
  const templateVars = {
    user_id: req.cookies["user_id"],
    user: users[req.cookies["user_id"]],
  };
  res.render('urls_login', templateVars)
});

//redirects to long URL website, from urls_show clicking on shortURL
app.get('/u/:shortURL', (req, res) => {
  let keys = Object.keys(urlDatabase)
  if (!keys.includes(req.params.shortURL)) {
    res.status(403).send('Invalid URL Path');
  } else {
    const longURL = urlDatabase[req.params.shortURL]["longURL"];
    res.redirect(longURL);
  }
});


      //////// post routes //////

//generate new shortURL then send to independant page
app.post('/urls', (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect('/login');
  } else {
    let shortURL = generateRandom6DigitString();
    urlDatabase[shortURL]={"userID":req.cookies["user_id"]};
    urlDatabase[shortURL]["longURL"] = req.body.longURL
    res.redirect(`/urls/${shortURL}`);
  }
});

//edits long URL from urls_show then goes to my URL page
app.post('/urls/:id', (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect('/login');
  } else if(urlDatabase[req.params.id]["userID"] !== req.cookies["user_id"]) {
      res.status(403).send("You may not edit URLs that you did not create");
  } else {
    let shortURL = req.params.id;
    const newLongURL = req.body.longURL
    urlDatabase[shortURL]["longURL"] = newLongURL;
    res.redirect("/urls")
  }
});

//deletes key:pair from urldatabase object
app.post('/urls/:shortURL/delete', (req, res) => {
  if(urlDatabase[req.params.shortURL]["userID"] !== req.cookies["user_id"]) {
    res.status(403).send("You may not delete URLs that you did not create");
  }
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

//logs user out and clears cookie
app.post('/logout', (req, res) => {
  res.clearCookie('user_id')
  res.clearCookie('email')
  res.clearCookie('password')
  res.redirect('/login');
});

//creates user, creates cookie for email/pw. pushes new user to global userobj
app.post('/register', (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send('Email and/or password must not be empty');
  }
  
  for (const user in users) {
    if (req.body.email === users[user]["email"]) {
      res.status(400).send('Email has already been registered');
    }
  }
  const id = generateRandom6DigitString();
  users[id] = {
    id,
    email: req.body.email,
    password: req.body.password
  };
  res.cookie('user_id', id);
  res.redirect('/urls');
});

//confirms login info, then sets cookies
app.post('/login', (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send('Email and/or password must not be empty');
  }
  for (const user in users) {
    if (req.body.email === users[user]["email"]) {
      if(req.body.password !== users[user]["password"]) {
        res.status(403).send('Password did not match, please try again.');
      } else {
        // res.cookie('email', req.body.email);
        res.cookie('user_id', user);
        res.redirect('/urls');
      }
    } else {
      res.status(403).send('Email did match any emails on record.');
    }
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
