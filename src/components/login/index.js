import React from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "./index.scss";

function Login() {
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  function submit(event) {
    event.preventDefault();
    console.log("click");
  }

  return (
    <main className="login">
      <ThemeProvider theme={darkTheme}>
        <form className="loginContainer" onSubmit={submit}>
          <h1 className="loginTitle">Login</h1>
          <div className="usernameContainer">
            <TextField
              required
              className="username"
              label="Username"
              variant="filled"
              color="primary"
              autoComplete="username"
            />
          </div>
          <div className="passwordContainer">
            <TextField
              required
              className="password"
              label="Password"
              type="password"
              variant="filled"
              color="primary"
              autoComplete="current-password"
            />
          </div>
          <div className="submitContainer">
            <Button
              className="submit"
              variant="contained"
              color="primary"
              type="submit"
            >
              Login
            </Button>
          </div>
          <div className="createContainer">
            <Link className="link" href="/create">
              Create Account
            </Link>
          </div>
        </form>
      </ThemeProvider>
    </main>
  );
}
export default Login;
