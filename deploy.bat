@echo off
REM Manual fallback deploy. Normal deploys happen automatically when the GitHub repo changes
REM (including every save in /admin). Only use this if the Netlify<->GitHub link is broken.
REM
REM First time on this PC:  npx netlify-cli login   (opens the browser; no tokens in this file)
cd /d "%~dp0"
echo Building site...
node scripts\build.js || goto :fail
echo Deploying dist\ to Netlify (production)...
npx --yes netlify-cli deploy --dir "%~dp0dist" --site 0097b08c-08ac-4470-856b-a1d44c525b51 --prod || goto :fail
echo Done!
pause
exit /b 0
:fail
echo.
echo Deploy FAILED - see messages above.
pause
exit /b 1
