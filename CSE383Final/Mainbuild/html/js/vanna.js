$(function () {
  const API_BASE = 'http://127.0.0.1/vanna/api/v0';
  const $chat = $('#chatContainer');

  // Scrolls the chat container to the bottom
  function scrollToBottom() {
    const chatContainer = document.getElementById("chatContainer");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Appends a user or bot message to the chat window
  function appendMessage(text, sender) {
    const $wrap = $('<div>').addClass('message-wrapper');
    const label = sender === 'user' ? 'You' : 'Vanna';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    $wrap.append(
      $('<div>').addClass(`sender-label ${sender}`).text(label)
    );
    $wrap.append(
      $('<div>').addClass(`chat-message ${sender}`).text(text)
    );
    $wrap.append(
      $('<div>').addClass(`timestamp ${sender}`).text(time)
    );

    $chat.append($wrap);
    scrollToBottom();
  }

  // Appends a collapsible SQL result from Vanna
  function appendSQLCollapsible(sqlText) {
    const $sqlWrap = $('<div>').addClass('chat-message bot collapsible-sql');
    $sqlWrap.append($('<button>').addClass('sql-toggle').text('Show SQL'));
    $sqlWrap.append($('<pre>').addClass('sql-body').text(sqlText).hide());
    $chat.append($('<div>').addClass('message-wrapper').append(
      $('<div>').addClass('sender-label bot').text('Vanna'),
      $sqlWrap,
      $('<div>').addClass('timestamp').text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    ));
    scrollToBottom();
  }

  // Appends a result table (from SQL query) into the chat window
  function appendResultTable(dfJson) {
    console.log("Raw dfJson:", dfJson);
    try {
      const parsed = typeof dfJson === 'string' ? JSON.parse(dfJson) : dfJson;
      console.log("Parsed df:", parsed);
  
      if (Array.isArray(parsed) && parsed.length > 0) {
        const headers = Object.keys(parsed[0]);
        const $table = $('<table>').addClass('result-table');
        
        // Create header row
        const $thead = $('<thead>').append(
          $('<tr>').append(headers.map(h => $('<th>').text(h)))
        );
        
        // Create data rows
        const $tbody = $('<tbody>');
        parsed.forEach(row => {
          const $tr = $('<tr>').append(
            headers.map(h => $('<td>').text(row[h]))
          );
          $tbody.append($tr);
        });
  
        $table.append($thead, $tbody);
  
        // Append to chat like a message
        const $wrap = $('<div>').addClass('message-wrapper');
        $wrap.append($('<div>').addClass('sender-label bot').text('Vanna'));
        $wrap.append($('<div>').addClass('chat-message bot').append(
          $('<strong>').text('Result:'), $('<br>'), $table
        ));
        $wrap.append($('<div>').addClass('timestamp').text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
        $chat.append($wrap);
        scrollToBottom();
      } else {
        appendMessage('Results ▶ No rows returned from the database.', 'bot');
      }
    } catch (e) {
      console.error("JSON parse error:", e);
      appendMessage('Results ▶ Failed to parse result.', 'bot');
    }
  }

  // Loads log data from PHP and appends it as a message with a table
  function appendLogTable(date = new Date().toISOString().split('T')[0], numRecords = 5) {
    $.ajax({
      url: '/final.php/getLog',
      method: 'POST',
      data: { date, numRecords },
      success: function (response) {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        const $wrap = $('<div>').addClass('message-wrapper');
        $wrap.append($('<div>').addClass('sender-label bot').text('Vanna'));

        if (data.status !== 0 || !Array.isArray(data.result) || data.result.length === 0) {
          $wrap.append($('<div>').addClass('chat-message bot').text('⚠️ No logs found.'));
        } else {
          const headers = Object.keys(data.result[0]);
          const table = $('<table>').addClass('result-table');
          const thead = $('<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>');
          const rows = data.result.map(row => {
            return '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>';
          });
          table.append(thead).append('<tbody>' + rows.join('') + '</tbody>');
          $wrap.append($('<div>').addClass('chat-message bot').append(table));
        }

        $wrap.append($('<div>').addClass('timestamp').text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
        $chat.append($wrap);
        scrollToBottom();
      },
      error: function () {
        appendMessage('Failed to load logs.', 'bot');
      }
    });
  }

  // Calls the backend to generate SQL from a natural language question
  function generateSQL(question) {
    return $.ajax({
      url: `${API_BASE}/generate_sql`,
      method: 'GET',
      data: { question },
      dataType: 'json'
    });
  }

  // Executes a SQL query by ID using the Vanna backend
  function runSQL(id) {
    return $.ajax({
      url: `${API_BASE}/run_sql`,
      method: 'GET',
      data: { id },
      dataType: 'json'
    });
  }

  // Logs a user interaction to the PHP backend
  function addLog(question, id, sql, df) {
    const payload = {
      function: "query",
      question: question,
      vanna_id: id,
      sql: sql,
      result: df
    };

    return $.ajax({
      url: '/final.php/addLog',
      method: 'POST',
      data: payload,
      dataType: 'json'
    });
  }

  // Utility function to pause execution for a set time
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Handles form submission: gets SQL, executes, logs, and displays result
  $('#queryForm').on('submit', async function (e) {
    e.preventDefault();
    const question = $('#userQuery').val().trim();
    if (!question) return alert('Please ask something.');

    appendMessage(question, 'user');
    $('#userQuery').val('');

    let vannaId, sqlText;

    try {
      const sqlRes = await generateSQL(question);
      if (sqlRes.type === 'error') throw new Error(sqlRes.error);

      vannaId = sqlRes.id;
      sqlText = sqlRes.text;
      appendSQLCollapsible(sqlText);

      await delay(300);

      const runRes = await runSQL(vannaId);
      if (runRes.type === 'error') throw new Error(runRes.error);

      appendResultTable(runRes.df);
      await addLog(question, vannaId, sqlText, runRes.df);
    } catch (err) {
      console.error("Error during query:", err);
      appendMessage('Error: ' + err.message, 'bot');
    }
  });

  // Handles toggling of collapsible SQL blocks
  $('#chatContainer').on('click', '.sql-toggle', function () {
    const $btn = $(this);
    const $pre = $btn.siblings('.sql-body');
    $pre.toggle();
    $btn.text($pre.is(':visible') ? 'Hide SQL' : 'Show SQL');
  });

  // Handles loading logs into the chat window
  $('#loadLogsBtn').on('click', function () {
    appendLogTable();
  });
});
