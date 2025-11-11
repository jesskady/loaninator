import{parseISO, addMonths, differenceInDays} from "https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm";
let loanList = [];

class Loan {
    constructor(loanAmount, rate, term, period, startDate, extraPayment, extraPaymentIndex, pmts){
        this.loanAmount = loanAmount;
        this.rate = rate;
        this.term = term;
        this.period = period;
        this.startDate = startDate;
        this.extraPayment = extraPayment;
        this.extraPaymentIndex = extraPaymentIndex;
        this.pmts = pmts;
    }

    get paymentAmount(){
        return this.calcPayment();
    }

    calcPayment() {
        let ratePerTerm = this.rate / this.period;
        let numberOfPayments = this.term * this.period;
        //console.log(ratePerTerm, numberOfPayments);
        let paymentAmount = this.loanAmount * (ratePerTerm * (1 + ratePerTerm)**numberOfPayments) / ((1 + ratePerTerm)**numberOfPayments - 1); //P*(i(1+i)^n)/((1+i)^n-1)
        paymentAmount = Math.round(paymentAmount * 100) / 100;
        return paymentAmount;
    }
}

function roundTwo(n){
    return Math.round(n * 100) / 100;
}

function getRawValue(input) {
    let rawString = input.value.replace(/\D/g, "") || "0"; 
    return Number(rawString);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCurrencyDecimal(input) {
    const prev = input.value;
    const selStart = input.selectionStart ?? prev.length;
  
    // Count how many [0-9 or .] were to the left of the caret previously
    const leftLogicalCount = (prev.slice(0, selStart).match(/[0-9.]/g) || []).length;
  
    // 1) Normalize -> keep only digits and the first dot (if any)
    let raw = prev.replace(/[^0-9.]/g, "");
    const firstDot = raw.indexOf(".");
    if (firstDot !== -1) {
      // Keep first dot; remove any other dots
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
    }
  
    // If empty, clear field/dataset and bail
    if (raw === "") {
      input.value = "";
      input.dataset.raw = "0";
      return;
    }
  
    // 2) Split integer and fractional parts (only if user typed a dot)
    let integerPart = raw;
    let fractionPart = "";
    if (firstDot !== -1) {
      integerPart = raw.slice(0, firstDot);
      fractionPart = raw.slice(firstDot + 1).replace(/\D/g, "");
      // limit to 2 decimals (cents)
      fractionPart = fractionPart.slice(0, 2);
    }
  
    // Remove leading zeros but keep at least "0"
    integerPart = integerPart.replace(/^0+(?=\d)/, "");
    if (integerPart === "") integerPart = "0";
  
    // 3) Format integer with commas
    const intNumber = Number(integerPart);
    const intFormatted = intNumber.toLocaleString("en-US");
  
    // 4) Build display and dataset.raw
    let display = "$" + intFormatted;
    let rawNumberString = integerPart;
    if (firstDot !== -1) {
      display += "." + fractionPart; // show trailing dot if no digits yet
      rawNumberString += "." + (fractionPart || "");
    }
    input.value = display;
  
    // dataset.raw mirrors user state: "1234", "1234.5", or "1234."
    input.dataset.raw =
      firstDot !== -1 ? (fractionPart === "" ? integerPart + "." : rawNumberString) : integerPart;
  
    // 5) Restore caret (with fix for the lone-dot case)
    const justTypedLoneDot =
      firstDot !== -1 &&
      !/\d/.test(prev.slice(0, selStart)) && // no digits before caret previously
      prev[selStart - 1] === ".";            // last char typed was '.'
  
    // Map of logical caret spots (after each [0-9 or .])
    const logicalSpots = [];
    for (let i = 0; i < display.length; i++) {
      if (/[0-9.]/.test(display[i])) logicalSpots.push(i + 1);
    }
  
    let newCaret;
    if (justTypedLoneDot) {
      // Put caret right after the dot we rendered (e.g., "$0.|")
      newCaret = display.indexOf(".") + 1;
    } else if (leftLogicalCount <= 0) {
      newCaret = display.indexOf("$") + 1; // just after $
    } else if (leftLogicalCount > logicalSpots.length) {
      newCaret = display.length;
    } else {
      newCaret = logicalSpots[leftLogicalCount - 1];
    }
  
    newCaret = Math.max(0, Math.min(display.length, newCaret));
    input.setSelectionRange(newCaret, newCaret);
  }

  function formatPercentDecimal(input) {
    const prev = input.value;
    const selStart = input.selectionStart ?? prev.length;
  
    // Count logical chars (digits and .) to the left of caret
    const leftLogicalCount = (prev.slice(0, selStart).match(/[0-9.]/g) || []).length;
  
    // Strip everything except digits and first dot
    let raw = prev.replace(/[^0-9.]/g, "");
    const firstDot = raw.indexOf(".");
    if (firstDot !== -1) {
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
    }
  
    // Special case: user typed '.' into empty field
    if (raw === ".") {
      input.value = "0.%";
      input.dataset.raw = "0.";
      const dotPos = input.value.indexOf(".") + 1;
      input.setSelectionRange(dotPos, dotPos); // caret after dot, before %
      return;
    }
  
    if (raw === "") {
      input.value = "";
      input.dataset.raw = "0";
      return;
    }

    // Limit fraction to 4 decimal places
    if (firstDot !== -1) {
        const integerPart = raw.slice(0, firstDot);
        let fractionPart = raw.slice(firstDot + 1);
        fractionPart = fractionPart.slice(0, 4); // <= 4 digits
        raw = integerPart + "." + fractionPart;
    }
  
    // Build display and dataset.raw
    input.value = raw + "%";
    input.dataset.raw = raw;
  
    // Reposition caret using logical spots
    const logicalSpots = [];
    for (let i = 0; i < input.value.length; i++) {
      if (/[0-9.]/.test(input.value[i])) logicalSpots.push(i + 1);
    }
  
    let newCaret;
    if (leftLogicalCount <= 0) {
      newCaret = 0; // before first digit
    } else if (leftLogicalCount > logicalSpots.length) {
      newCaret = input.value.length - 1; // before the %
    } else {
      newCaret = logicalSpots[leftLogicalCount - 1];
    }
  
    newCaret = Math.max(0, Math.min(input.value.length - 1, newCaret));
    input.setSelectionRange(newCaret, newCaret);
  }

function onFocusPercent(input) {
    let cursorPosition;
    let length = input.value.length;
    let percentSignLocation = input.value.indexOf('%');
    if(percentSignLocation !== -1){
        cursorPosition = length - 1;
    } else {
        cursorPosition = length;
    }
    input.setSelectionRange(cursorPosition, cursorPosition);
}

function amortization(L){
    //console.log(L.paymentAmount);
    //let pmt = L.paymentAmount;
    let currentBal = L.loanAmount;
    let pmts = [];
    let thisDate = L.startDate;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let actualPaymentCount;
    pmts[0] = {
        month: 0,
        balance: formatCurrency(currentBal),
        payment: null,
        interest: null,
        principal: null,
        date: formatDate(L.startDate),
        totalInt: null,
        totalPrin: null,
        notes: ''
    };

    for(let i = 1; i <= (L.term * L.period); i++){
        actualPaymentCount = i;
        let lastDate = thisDate;
        let lastBal = currentBal;
        //let currentBal;
        let thisInterest;
        let thisPrincipal;
        let adjustment = 0;
        let extraPrincipal = 0;
        let notes = '';
        //thisDate.setMonth(thisDate.getMonth() + 1);
        thisDate = addMonths(lastDate, 1);
        //console.log(thisDate);
        //daysDifference = (thisDate - lastDate.getTime()) / (1000*60*60*24); //milliseconds diff divided by milliseconds in a day
        let daysDifference = differenceInDays(thisDate, lastDate);

        if(L.extraPaymentIndex == i){
            extraPrincipal = L.extraPayment;
            notes = 'Extra payment of '+ formatCurrency(extraPrincipal);
        }

        thisInterest = (lastBal * L.rate / 365) * daysDifference;
        thisInterest = roundTwo(thisInterest);
        thisPrincipal = roundTwo(L.paymentAmount - thisInterest + extraPrincipal);
        currentBal = roundTwo(lastBal - thisPrincipal);

        totalInterest = roundTwo(totalInterest + thisInterest);
        totalPrincipal = roundTwo(totalPrincipal + thisPrincipal);

        if(currentBal < 0){
            adjustment = currentBal; //last payment will be this much less. adjusts payment and principal
            currentBal = 0;
            totalPrincipal = L.loanAmount;
        }

        

        pmts[i] = {
            month: i,
            balance: formatCurrency(currentBal),
            payment: formatCurrency(L.paymentAmount + adjustment),
            interest: formatCurrency(thisInterest),
            principal: formatCurrency(thisPrincipal + adjustment),
            date: formatDate(thisDate),
            totalInt: formatCurrency(totalInterest),
            totalPrin: formatCurrency(totalPrincipal),
            notes: notes
        };

        if(currentBal == 0){
            i = (L.term * L.period) + 1; // finish loop
        }
    }

    L.actualPaymentCount = actualPaymentCount;
    L.totalInterest = totalInterest;
    L.pmts = pmts;
    loanList.push(L);
    drawAmortTable(pmts);
}

function drawAmortTable(pmts){
    let amortContainer = document.getElementById('amortization_container');
    amortContainer.innerHTML = '';

    let tbl = document.createElement('table');
    amortContainer.appendChild(tbl);
    let headerRow = document.createElement('tr');
    headerRow.id = 'header_row';
    tbl.appendChild(headerRow);

    let headers = ['Month', 'Balance', 'Payment', 'Interest', 'Principal', 'Date', 'Total Interest', 'Total Principal', 'Notes'];

    headers.forEach(function(h){
        let thisHeader = document.createElement('th');
        thisHeader.textContent = h;
        headerRow.appendChild(thisHeader);
    });

    pmts.forEach(function(p){
        let thisRow = document.createElement('tr');
        tbl.appendChild(thisRow);
        Object.keys(p).forEach(function(thisKey){
            let thisData = document.createElement('td');
            thisData.textContent = p[thisKey];
            thisRow.appendChild(thisData);
        });
    })
}

document.addEventListener("DOMContentLoaded", () => {
    console.log('loaded');
    const moneyInputs = document.querySelectorAll(".currency");
    const percentInputs = document.querySelectorAll(".percent");
    const loanDetailsForm = document.getElementById('loan_details_form');
    const analysisCheckbox = document.getElementById('analysis');
    const fieldsDiv = document.getElementById("analysis_fields");
        

    function analysisInputHandler(){
        const inputs = fieldsDiv.querySelectorAll("input, select, textarea");
        inputs.forEach(el => el.disabled = !analysisCheckbox.checked);
    }
  
    moneyInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
            formatCurrencyDecimal(e.target);
        });
    });

    percentInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
            formatPercentDecimal(e.target);
        });
        input.addEventListener("focus", (e) => {
            onFocusPercent(e.target);
        })
    });

    loanDetailsForm.addEventListener("submit", function(e){ 
        e.preventDefault(); //prevent reloading

        let f = loanDetailsForm;
        let L = new Loan(
            getRawValue(f.loan_amount),
            getRawValue(f.interest_rate) / 100,
            Number(f.term.value),
            Number(f.period.value),
            parseISO(f.start_date.value),
            getRawValue(f.extra_payment),
            Number(f.extra_payment_index.value),
            null, //pmts object
        );
        
        amortization(L);

        if(analysisCheckbox.checked){
            let L2 = new Loan(
                getRawValue(f.loan_amount),
                getRawValue(f.interest_rate) / 100,
                Number(f.term.value),
                Number(f.period.value),
                parseISO(f.start_date.value),
                0, //extra payment amount
                0, //extra payment index
                null, //pmts object
            );

            amortization(L2);
        }

        //draw table of final loan totals !!!
    });

    analysisCheckbox.addEventListener('change', () => {
        analysisInputHandler();
        //const fieldsDiv = document.getElementById("analysis_fields");
        //const inputs = fieldsDiv.querySelectorAll("input, select, textarea");
        //inputs.forEach(el => el.disabled = !analysisCheckbox.checked);
    });

    analysisCheckbox.checked = false;
    analysisInputHandler(); //start the analysis inputs disabled
});
