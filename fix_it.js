const fs = require('fs');
const path = 'c:/Users/Darshan/C-LAB V2/client/src/pages/ExperimentLab.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
let index = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '>' && lines[i-1] && lines[i-1].includes('</nav>')) {
        index = i;
        break;
    }
}
if (index !== -1) {
    lines[index] = "      {activeTab !== 'virtual' && (";
    lines.splice(index + 1, 0, 
        '        <div className="lab-overview-layout">',
        '          <aside className="lab-overview-sidebar">',
        '            <section className="lab-panel-card">',
        '              <div className="lab-card-title">',
        '                <Sparkles className="w-4 h-4" />',
        '                <strong>Experiment Catalog</strong>',
        '              </div>'
    );
    fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
    console.log('REPAIRED');
} else {
    console.log('NOT FOUND');
}
