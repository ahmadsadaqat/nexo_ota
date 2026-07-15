frappe.ui.form.on('Item', {
	onload: function(frm) {
		// onload logic if any
	}
});

frappe.ui.form.on('Add-Ons', {
	item_code: function(frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.item_code) {
			frappe.call({
				method: 'frappe.client.get_value',
				args: {
					doctype: 'Item Price',
					filters: {
						item_code: row.item_code,
						price_list: 'Standard Selling'
					},
					fieldname: 'price_list_rate'
				},
				callback: function(r) {
					if (r.message) {
						frappe.model.set_value(cdt, cdn, 'price', r.message.price_list_rate);
					} else {
						frappe.model.set_value(cdt, cdn, 'price', 0);
					}
				}
			});
		}
	}
});
