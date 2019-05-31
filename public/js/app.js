function getFields () {
    return {
        firstName: $('#first-name').val(),
        lastName: $('#last-name').val(),
        dateOfBirth: $('#date-of-birth').val(),
        phone: $('#phone').val(),
        bvn: $('#bvn').val()
    }
}

function validateFields (fields) {
    if (!fields.firstName) {
        return false
    }

    if (!fields.lastName) {
        return false
    }

    if (!fields.dateOfBirth) {
        return false
    }

    if (!fields.phone) {
        return false
    }

    if (!fields.bvn) {
        return false
    }

    return true
}

function clickFields () {
    $('[for=first-name]').addClass('active')
    $('[for=last-name]').addClass('active')
    $('[for=date-of-birth]').addClass('active')
    $('[for=phone]').addClass('active')
    $('[for=bvn]').addClass('active')
}

function showSubmitProgress () {
    $('.submit-progress').show()
}

function hideSubmitProgress () {
    $('.submit-progress').hide()
}

function initButtons () {
    // $('#budget').change(function () {
    //     var option = $('option:selected', this).attr('stud_name');
    //     $('#stud_name').val(option);
    // })
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function budgetsToTree (budgets) {
    var data = []

    for (const i in budgets) {
        const budget = budgets[i]
        data.push({
            id: budget._id,
            budgetId: budget._id,
            data: (budget.description || budget.reason) + '\n\n (NGN&nbsp;' + numberWithCommas(budget.amount) + ')',
            father: budget.parentId || null,
            color: mdColors[Math.floor(Math.random() * mdColors.length)]
        })
    }

    return data
}

function calculateBalance (budget, budgets) {
    var balance = budget.amount
    for (const b of budgets) {
        if (b._id != budget._id && b.parentId == budget._id) {
            balance -= b.amount
        }
    }

    return balance
}

function initDatepicker () {
    $('#date-of-birth').pickadate({
        selectMonths: true, // Creates a dropdown to control month
        selectYears: 15, // Creates a dropdown of 15 years to control year,
        today: 'Today',
        clear: 'Clear',
        close: 'Ok',
        closeOnSelect: false, // Close upon selecting a date,
        container: undefined, // ex. 'body' will append picker to body
      });
}

function initModal () {
    $('.modal').modal()
}

function initSelect () {
    $('select').material_select();
}

$(document).ready(function onReady () {
    initButtons()
    initDatepicker()
    initModal()
    hideSubmitProgress()

    initSelect()
})

const mdColors = [
    '#BBB',
    '#CCC',
    '#DDD'
  ];