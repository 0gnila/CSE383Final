$(document).ready(function() {
  let requestCount = 0;

  // Refresh logs when button is clicked
  $('#refreshLogs').click(function() {
    requestCount++;
    $('#requestCounter').text('Request #' + requestCount);

    const numRecords = $('#numRecords').val();
    const selectedDate = $('#logDate').val();
    const dateToSend = selectedDate || new Date().toISOString().split('T')[0];

    $('#logsContent').html('<div class="text-center"><p><span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Loading logs...</p></div>');
    $('#errorMessage').hide();

    $.ajax({
      url: 'final.php/getLog',
      type: 'GET',
      data: {
        date: dateToSend,
        numRecords: numRecords
      },
      success: function(response) {
        try {
          const data = typeof response === 'string' ? JSON.parse(response) : response;

          if (data.status === 0) {
            $('#logsContent').empty();

            if (data.result && data.result.length > 0) {
              data.result.forEach(function(log, index) {
                // Format the result field as a table if JSON array
                const parsedResult = (() => {
                  try {
                    const parsed = JSON.parse(log.result || '[]');
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      const headers = Object.keys(parsed[0]);
                      let table = '<table class="table table-bordered styled-table"><thead><tr>';
                      headers.forEach(h => table += `<th>${h}</th>`);
                      table += '</tr></thead><tbody>';
                      parsed.forEach(row => {
                        table += '<tr>';
                        headers.forEach(h => {
                          table += `<td>${row[h]}</td>`;
                        });
                        table += '</tr>';
                      });
                      table += '</tbody></table>';
                      return table;
                    } else {
                      return '<p>No result rows</p>';
                    }
                  } catch (e) {
                    return `<pre>${log.result || 'N/A'}</pre>`;
                  }
                })();

                const sqlSectionId = `sql-${index}`;
                const logHtml = `
                  <div class="log-entry">
                    <div class="row">
                      <div class="col-xs-8">
                        <span class="function">Function: ${log.function || 'N/A'}</span>
                      </div>
                      <div class="col-xs-4 text-right">
                        <span class="timestamp">${log.timestamp || 'N/A'}</span>
                      </div>
                    </div>
                    <div><strong>Question:</strong> ${log.question || 'N/A'}</div>
                    <div>
                      <button class="btn btn-xs btn-info toggle-sql" data-target="#${sqlSectionId}">Show SQL</button>
                    </div>
                    <div id="${sqlSectionId}" class="sql-section" style="display: none;">
                      <strong>SQL:</strong><br><pre>${log.sql || 'N/A'}</pre>
                    </div>
                    <div><strong>Result:</strong><br>${parsedResult}</div>
                  </div>
                `;

                $('#logsContent').append(logHtml);
              });

              // Toggle SQL visibility
              $('.toggle-sql').click(function() {
                const target = $(this).data('target');
                const $target = $(target);
                const isVisible = $target.is(':visible');
                $target.slideToggle();
                $(this).text(isVisible ? 'Show SQL' : 'Hide SQL');
              });

            } else {
              $('#logsContent').html('<div class="text-center"><p>No log entries found.</p></div>');
            }
          } else {
            $('#errorMessage').text('Error: ' + data.message).show();
            $('#logsContent').html('<div class="text-center"><p>Failed to load logs. Please try again.</p></div>');
          }
        } catch (e) {
          $('#errorMessage').text('Error parsing response: ' + e.message).show();
          $('#logsContent').html('<div class="text-center"><p>Failed to load logs. Please try again.</p></div>');
        }
      },
      error: function(xhr, status, error) {
        $('#errorMessage').text('Request failed: ' + error).show();
        $('#logsContent').html('<div class="text-center"><p>Failed to load logs. Please try again.</p></div>');
      }
    });
  });

  // Add CSS animation for spinning icon
  $('<style>')
    .prop('type', 'text/css')
    .html(`
      .glyphicon-spin {
        animation: spin 1s infinite linear;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `)
    .appendTo('head');
});
